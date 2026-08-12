import { createHash } from 'node:crypto'
import { estimateDailyMicronutrients } from './ai/providers/deepseekText.js'
import { query } from './db.js'

export const MICRONUTRIENT_IDS = [
  'vit_a',
  'vit_c',
  'vit_d',
  'vit_e',
  'vit_k',
  'vit_b1',
  'vit_b2',
  'vit_b6',
  'vit_b9',
  'vit_b12',
  'calcium',
  'iron',
  'zinc',
  'magnesium',
  'potassium',
  'iodine',
]

const MICRONUTRIENT_ID_SET = new Set(MICRONUTRIENT_IDS)
const MICRONUTRIENT_STATUS_SET = new Set(['adequate', 'low', 'unknown'])
const PENDING_STALE_MS = 60_000
const FORBIDDEN_SUGGESTION_RE =
  /(保健品|补充剂|胶囊|药片|片剂|口服液|品牌|\d\s*(?:mg|μg|ug|毫克|微克|片|粒))/i
const EXACT_QUANTITY_RE =
  /\d+(?:\.\d+)?\s*(?:mg|μg|ug|毫克|微克|%|％)/i

const FALLBACK_FOODS = {
  vit_a: ['胡萝卜', '菠菜'],
  vit_c: ['甜椒', '橙子'],
  vit_d: ['鸡蛋', '富脂鱼'],
  vit_e: ['杏仁', '葵花籽'],
  vit_k: ['菠菜', '西兰花'],
  vit_b1: ['全谷物', '瘦猪肉'],
  vit_b2: ['牛奶', '鸡蛋'],
  vit_b6: ['鸡肉', '香蕉'],
  vit_b9: ['深绿色叶菜', '豆类'],
  vit_b12: ['鱼', '鸡蛋'],
  calcium: ['牛奶', '豆腐'],
  iron: ['瘦肉', '菠菜'],
  zinc: ['瘦肉', '南瓜籽'],
  magnesium: ['坚果', '全谷物'],
  potassium: ['香蕉', '土豆'],
  iodine: ['海带', '加碘盐烹调的家常菜'],
}

const taskChains = new Map()
const MICRONUTRIENT_RETURNING = `
  micronutrient_status,
  micronutrient_fingerprint,
  micronutrient_summary,
  micronutrient_updated_at,
  micronutrient_error`

function clippedText(value, maxLength) {
  return Array.from(String(value ?? '').trim()).slice(0, maxLength).join('')
}

function fingerprintSource(meals) {
  return [...meals]
    .sort((a, b) => {
      const left = String(a.id)
      const right = String(b.id)
      return left < right ? -1 : left > right ? 1 : 0
    })
    .map((meal) => `${meal.id}|${String(meal.name ?? '').trim()}|${String(meal.kcal)}`)
    .join('\n')
}

export function createMicronutrientFingerprint(meals) {
  return createHash('sha256').update(fingerprintSource(meals)).digest('hex')
}

function normalizeSuggestions(raw, id) {
  const values = Array.isArray(raw) ? raw : []
  const safe = []
  for (const value of values) {
    const text = clippedText(value, 20)
    if (!text || FORBIDDEN_SUGGESTION_RE.test(text) || safe.includes(text)) continue
    safe.push(text)
    if (safe.length === 3) break
  }
  return safe.length > 0 ? safe : FALLBACK_FOODS[id].slice(0, 2)
}

function normalizeNote(raw, status) {
  const text = clippedText(raw, 80)
  if (!EXACT_QUANTITY_RE.test(text)) return text
  if (status === 'low') return '根据当天餐食名称推断，相关食物来源可能较少。'
  if (status === 'adequate') return '根据当天餐食名称推断，可能已有相关食物来源。'
  return '餐食信息不足，暂时无法可靠判断。'
}

export function normalizeMicronutrientSummary(raw) {
  let parsed = raw
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw)
    } catch {
      parsed = null
    }
  }
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.items)) {
    const err = new Error('AI 返回的微量元素格式无效')
    err.status = 502
    throw err
  }

  const byId = new Map()
  for (const item of parsed.items) {
    if (!item || typeof item !== 'object') continue
    const id = String(item.id ?? '').trim()
    if (!MICRONUTRIENT_ID_SET.has(id)) continue
    const status = MICRONUTRIENT_STATUS_SET.has(item.status)
      ? item.status
      : 'unknown'
    byId.set(id, {
      id,
      status,
      note: normalizeNote(item.note, status),
      food_suggestions:
        status === 'low' ? normalizeSuggestions(item.food_suggestions, id) : [],
    })
  }

  return {
    version: 1,
    items: MICRONUTRIENT_IDS.map(
      (id) =>
        byId.get(id) ?? {
          id,
          status: 'unknown',
          note: '',
          food_suggestions: [],
        },
    ),
    advice: EXACT_QUANTITY_RE.test(String(parsed.advice ?? ''))
      ? ''
      : clippedText(parsed.advice, 80),
  }
}

export function isMicronutrientResultCurrent(taskFingerprint, meals) {
  return taskFingerprint === createMicronutrientFingerprint(meals)
}

async function loadDayContext(userId, dayLogId) {
  const [dayResult, mealResult] = await Promise.all([
    query(
      `select dl.*, p.sex
       from day_logs dl
       left join profiles p on p.id = dl.user_id
       where dl.id = $1 and dl.user_id = $2`,
      [dayLogId, userId],
    ),
    query(
      `select id, name, kcal
       from meals
       where day_log_id = $1 and user_id = $2
       order by id`,
      [dayLogId, userId],
    ),
  ])
  return { dayLog: dayResult.rows[0] ?? null, meals: mealResult.rows }
}

async function resetEmptyDay(userId, dayLogId) {
  const { rows } = await query(
    `update day_logs
     set micronutrient_status = 'idle',
         micronutrient_fingerprint = null,
         micronutrient_summary = null,
         micronutrient_updated_at = null,
         micronutrient_error = null
     where id = $1 and user_id = $2
     returning ${MICRONUTRIENT_RETURNING}`,
    [dayLogId, userId],
  )
  return rows[0] ?? null
}

async function markPending(userId, dayLogId) {
  const { rows } = await query(
    `update day_logs
     set micronutrient_status = 'pending',
         micronutrient_updated_at = now(),
         micronutrient_error = null
     where id = $1 and user_id = $2
     returning ${MICRONUTRIENT_RETURNING}`,
    [dayLogId, userId],
  )
  return rows[0] ?? null
}

const CURRENT_FINGERPRINT_SQL = `
  encode(
    digest(
      coalesce((
        select string_agg(
          m.id::text || '|' || trim(m.name) || '|' || m.kcal::text,
          E'\\n' order by m.id::text
        )
        from meals m
        where m.day_log_id = day_logs.id
          and m.user_id = day_logs.user_id
      ), ''),
      'sha256'
    ),
    'hex'
  )`

async function writeReadyIfCurrent(userId, dayLogId, fingerprint, summary) {
  const { rows } = await query(
    `update day_logs
     set micronutrient_status = 'ready',
         micronutrient_fingerprint = $3,
         micronutrient_summary = $4::jsonb,
         micronutrient_updated_at = now(),
         micronutrient_error = null
     where id = $1 and user_id = $2
       and ${CURRENT_FINGERPRINT_SQL} = $3
     returning id`,
    [dayLogId, userId, fingerprint, JSON.stringify(summary)],
  )
  return Boolean(rows[0])
}

function friendlyMicronutrientError(err) {
  if (err?.status === 503) return 'AI 暂未配置，可稍后重试'
  if (err?.status === 504) return 'AI 更新超时，可稍后重试'
  return '微量元素更新失败，请稍后重试'
}

async function writeErrorIfCurrent(userId, dayLogId, fingerprint, err) {
  await query(
    `update day_logs
     set micronutrient_status = 'error',
         micronutrient_updated_at = now(),
         micronutrient_error = $4
     where id = $1 and user_id = $2
       and ${CURRENT_FINGERPRINT_SQL} = $3`,
    [dayLogId, userId, fingerprint, friendlyMicronutrientError(err)],
  )
}

async function refreshDay(
  userId,
  dayLogId,
  { pendingAlready = false, force = false } = {},
) {
  const context = await loadDayContext(userId, dayLogId)
  if (!context.dayLog) return
  if (context.meals.length === 0) {
    await resetEmptyDay(userId, dayLogId)
    return
  }

  const fingerprint = createMicronutrientFingerprint(context.meals)
  if (
    !force &&
    context.dayLog.micronutrient_status === 'ready' &&
    context.dayLog.micronutrient_fingerprint === fingerprint
  ) {
    return
  }
  if (!pendingAlready) await markPending(userId, dayLogId)
  try {
    const raw = await estimateDailyMicronutrients({
      meals: context.meals,
      sex: context.dayLog.sex,
    })
    const summary = normalizeMicronutrientSummary(raw)
    const latest = await loadDayContext(userId, dayLogId)
    if (!isMicronutrientResultCurrent(fingerprint, latest.meals)) return
    await writeReadyIfCurrent(userId, dayLogId, fingerprint, summary)
  } catch (err) {
    console.warn(
      '[micronutrients] refresh failed:',
      err?.code || err?.message || err,
    )
    const latest = await loadDayContext(userId, dayLogId)
    if (!isMicronutrientResultCurrent(fingerprint, latest.meals)) return
    await writeErrorIfCurrent(userId, dayLogId, fingerprint, err)
  }
}

export function scheduleMicronutrientRefresh(
  userId,
  dayLogId,
  { pendingAlready = false, force = false } = {},
) {
  const key = `${userId}:${dayLogId}`
  const previous = taskChains.get(key) ?? Promise.resolve()
  const task = previous
    .catch(() => undefined)
    .then(() => refreshDay(userId, dayLogId, { pendingAlready, force }))
  taskChains.set(key, task)
  void task
    .finally(() => {
      if (taskChains.get(key) === task) taskChains.delete(key)
    })
    .catch(() => undefined)
}

function pendingIsStale(updatedAt) {
  const timestamp = new Date(updatedAt ?? 0).getTime()
  return !Number.isFinite(timestamp) || Date.now() - timestamp > PENDING_STALE_MS
}

export async function ensureMicronutrientsForDayRead({ userId, dayLog, meals }) {
  if (meals.length === 0) {
    if (
      dayLog.micronutrient_status !== 'idle' ||
      dayLog.micronutrient_summary != null ||
      dayLog.micronutrient_fingerprint != null
    ) {
      const reset = await resetEmptyDay(userId, dayLog.id)
      return reset ? { ...dayLog, ...reset } : dayLog
    }
    return dayLog
  }

  const fingerprint = createMicronutrientFingerprint(meals)
  const status = dayLog.micronutrient_status ?? 'idle'
  const shouldStart =
    status === 'idle' ||
    (status === 'ready' && dayLog.micronutrient_fingerprint !== fingerprint) ||
    (status === 'pending' && pendingIsStale(dayLog.micronutrient_updated_at))

  if (!shouldStart) return dayLog
  const pending = await markPending(userId, dayLog.id)
  scheduleMicronutrientRefresh(userId, dayLog.id, { pendingAlready: true })
  return pending ? { ...dayLog, ...pending } : dayLog
}

export async function requestMicronutrientRefresh(userId, logDate) {
  const { rows } = await query(
    `select *, log_date::text as log_date
     from day_logs where user_id = $1 and log_date = $2`,
    [userId, logDate],
  )
  const dayLog = rows[0]
  if (!dayLog) return null
  const mealResult = await query(
    `select id, name, kcal from meals
     where day_log_id = $1 and user_id = $2 order by id`,
    [dayLog.id, userId],
  )
  if (mealResult.rows.length === 0) {
    const reset = await resetEmptyDay(userId, dayLog.id)
    return reset ? { ...dayLog, ...reset } : dayLog
  }
  const pending = await markPending(userId, dayLog.id)
  scheduleMicronutrientRefresh(userId, dayLog.id, {
    pendingAlready: true,
    force: true,
  })
  return pending ? { ...dayLog, ...pending } : dayLog
}

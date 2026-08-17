import { createHash } from 'node:crypto'
import { estimateMealMicronutrients, MAX_HTTP_RETRIES, NUTRITION_TIMEOUT_MS } from './ai/providers/deepseekText.js'
import { formatDateKeyInTz } from './dateKey.js'
import { query } from './db.js'
import { ageFromBirthdayKey } from './profilePatch.js'
import {
  MICRONUTRIENT_AMOUNT_CAPS,
  MICRONUTRIENT_IDS,
  MICRONUTRIENT_UNITS,
  resolveMicronutrientTargets,
} from './micronutrientTargets.js'

export { MICRONUTRIENT_IDS }

const MICRONUTRIENT_ID_SET = new Set(MICRONUTRIENT_IDS)
const MICRONUTRIENT_STATUS_SET = new Set(['adequate', 'low', 'unknown'])
const CONFIDENCE_SET = new Set(['high', 'medium', 'low', 'unknown'])
/** Pro+thinking 单次最长约 90s，HTTP 最多再试 3 次。短于此时窗会把营养页 1.5s 轮询当成任务死亡并重复入队。 */
export const PENDING_STALE_MS = NUTRITION_TIMEOUT_MS * MAX_HTTP_RETRIES + 60_000
const ADEQUATE_RATIO = 0.8
const FORBIDDEN_SUGGESTION_RE =
  /(保健品|补充剂|胶囊|药片|片剂|口服液|品牌|\d\s*(?:mg|μg|ug|毫克|微克|片|粒))/i

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

export function createMealMicronutrientFingerprint(name, kcal) {
  return createHash('sha256')
    .update(`${String(name ?? '').trim()}|${String(kcal)}`)
    .digest('hex')
}

export function mealNeedsMicronutrientEstimate(meal, { force = false } = {}) {
  if (force) return true
  const fingerprint = createMealMicronutrientFingerprint(meal?.name, meal?.kcal)
  if (meal?.micronutrients_fingerprint !== fingerprint) return true
  return !parseMealMicronutrients(meal?.micronutrients)
}

function parseJsonObject(raw) {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw
  if (typeof raw !== 'string') return null
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : null
  } catch {
    return null
  }
}

function normalizeUnit(raw) {
  const text = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace('μg', 'µg')
    .replace('ug', 'µg')
    .replace('微克', 'µg')
    .replace('毫克', 'mg')
  if (text === 'mg' || text === 'µg') return text
  return null
}

function convertAmount(amount, fromUnit, toUnit) {
  if (fromUnit === toUnit) return amount
  if (fromUnit === 'mg' && toUnit === 'µg') return amount * 1000
  if (fromUnit === 'µg' && toUnit === 'mg') return amount / 1000
  return null
}

export function normalizeMealMicronutrients(raw) {
  const parsed = parseJsonObject(raw)
  if (!parsed) {
    const err = new Error('AI 返回的餐级微量元素格式无效')
    err.status = 502
    throw err
  }

  const components = []
  const seenComponents = new Set()
  for (const item of Array.isArray(parsed.components) ? parsed.components : []) {
    if (!item || typeof item !== 'object') continue
    const name = clippedText(item.name, 40)
    const grams = Number(item.grams ?? item.g)
    if (!name || !Number.isFinite(grams) || grams <= 0 || grams > 5000) continue
    const key = name.toLowerCase()
    if (seenComponents.has(key)) continue
    seenComponents.add(key)
    components.push({ name, grams: Math.round(grams * 10) / 10 })
    if (components.length === 12) break
  }

  const byId = new Map()
  for (const item of Array.isArray(parsed.items) ? parsed.items : []) {
    if (!item || typeof item !== 'object') continue
    const id = String(item.id ?? '').trim()
    if (!MICRONUTRIENT_ID_SET.has(id)) continue
    const expectedUnit = MICRONUTRIENT_UNITS[id]
    const unit = normalizeUnit(item.unit) ?? expectedUnit
    let amount = Number(item.amount)
    if (!Number.isFinite(amount) || amount < 0) {
      byId.set(id, {
        id,
        amount: 0,
        unit: expectedUnit,
        confidence: 'unknown',
      })
      continue
    }
    const converted = convertAmount(amount, unit, expectedUnit)
    amount = converted == null ? 0 : converted
    const cap = MICRONUTRIENT_AMOUNT_CAPS[id]
    const confidenceRaw = String(item.confidence ?? '').trim().toLowerCase()
    let confidence = CONFIDENCE_SET.has(confidenceRaw)
      ? confidenceRaw
      : converted == null
        ? 'unknown'
        : 'low'
    if (converted == null) {
      amount = 0
      confidence = 'unknown'
    } else if (amount > cap) {
      amount = cap
      confidence = 'low'
    }
    byId.set(id, {
      id,
      amount: Math.round(amount * 1000) / 1000,
      unit: expectedUnit,
      confidence,
    })
  }

  if (byId.size === 0 && components.length === 0 && !Array.isArray(parsed.items)) {
    const err = new Error('AI 返回的餐级微量元素格式无效')
    err.status = 502
    throw err
  }

  return {
    version: 1,
    components,
    items: MICRONUTRIENT_IDS.map(
      (id) =>
        byId.get(id) ?? {
          id,
          amount: 0,
          unit: MICRONUTRIENT_UNITS[id],
          confidence: 'unknown',
        },
    ),
  }
}

export function parseMealMicronutrients(raw) {
  const parsed = parseJsonObject(raw)
  if (!parsed || !Array.isArray(parsed.items)) return null
  try {
    return normalizeMealMicronutrients(parsed)
  } catch {
    return null
  }
}

function fallbackSuggestions(id) {
  return FALLBACK_FOODS[id].slice(0, 2)
}

function coverageEnough(knownCount, mealCount) {
  if (mealCount <= 0) return false
  return knownCount >= Math.ceil(mealCount / 2) || knownCount >= 1
}

export function rollupMicronutrientSummary(meals, { sex, age } = {}) {
  const targets = resolveMicronutrientTargets({ sex, age })
  const parsedMeals = (meals ?? [])
    .map((meal) => parseMealMicronutrients(meal?.micronutrients))
    .filter(Boolean)
  const mealCount = meals?.length ?? 0
  const dayAmounts = Object.fromEntries(MICRONUTRIENT_IDS.map((id) => [id, 0]))
  const knownCounts = Object.fromEntries(MICRONUTRIENT_IDS.map((id) => [id, 0]))

  for (const meal of parsedMeals) {
    for (const item of meal.items) {
      dayAmounts[item.id] += item.amount
      if (item.confidence === 'medium' || item.confidence === 'high') {
        knownCounts[item.id] += 1
      }
    }
  }

  const items = MICRONUTRIENT_IDS.map((id) => {
    const driAmount = targets.amounts[id]
    const estimatedAmount = Math.round(dayAmounts[id] * 1000) / 1000
    const estimatedPct =
      driAmount > 0 ? Math.round((estimatedAmount / driAmount) * 1000) / 10 : null
    const coverage = mealCount > 0 ? knownCounts[id] / mealCount : 0
    let status = 'unknown'
    if (estimatedPct != null && estimatedPct >= ADEQUATE_RATIO * 100) {
      status = 'adequate'
    } else if (coverageEnough(knownCounts[id], mealCount)) {
      status = 'low'
    }
    const note =
      status === 'adequate'
        ? `今日估算合计约达参考值的 ${Math.min(estimatedPct ?? 0, 999)}%。`
        : status === 'low'
          ? `今日估算合计约达参考值的 ${estimatedPct ?? 0}%，来源可能偏少。`
          : '部分餐食信息不足，暂时无法可靠判断。'
    return {
      id,
      status,
      note,
      food_suggestions: status === 'low' ? fallbackSuggestions(id) : [],
      estimated_amount: estimatedAmount,
      unit: MICRONUTRIENT_UNITS[id],
      dri_amount: driAmount,
      estimated_pct: estimatedPct,
      coverage,
    }
  })

  const lowCount = items.filter((item) => item.status === 'low').length
  const adequateCount = items.filter((item) => item.status === 'adequate').length
  const advice =
    mealCount === 0
      ? ''
      : lowCount > 0
        ? `有 ${lowCount} 项可能不足，可用日常食物慢慢补上。`
        : adequateCount >= 10
          ? '多数微量元素估算已接近参考值，继续保持食物多样。'
          : '已按今天吃过的食物汇总估算，信息不足的项目会随记餐补全。'

  return {
    version: 2,
    items,
    advice,
    profile_band: {
      sex: targets.sex,
      ageBand: targets.ageBand,
      label: targets.label,
    },
  }
}

export function normalizeMicronutrientSummary(raw) {
  const parsed = parseJsonObject(raw)
  if (!parsed || !Array.isArray(parsed.items)) {
    const err = new Error('微量元素快照格式无效')
    err.status = 502
    throw err
  }

  if (Number(parsed.version) === 2) {
    return {
      version: 2,
      items: MICRONUTRIENT_IDS.map((id) => {
        const item = parsed.items.find((entry) => entry?.id === id) ?? {}
        const status = MICRONUTRIENT_STATUS_SET.has(item.status)
          ? item.status
          : 'unknown'
        return {
          id,
          status,
          note: clippedText(item.note, 80),
          food_suggestions:
            status === 'low'
              ? Array.isArray(item.food_suggestions) && item.food_suggestions.length
                ? item.food_suggestions.slice(0, 3).map((value) => clippedText(value, 20))
                : fallbackSuggestions(id)
              : [],
          estimated_amount: Number(item.estimated_amount) || 0,
          unit: MICRONUTRIENT_UNITS[id],
          dri_amount: Number(item.dri_amount) || 0,
          estimated_pct:
            Number.isFinite(Number(item.estimated_pct))
              ? Number(item.estimated_pct)
              : null,
          coverage: Number(item.coverage) || 0,
        }
      }),
      advice: clippedText(parsed.advice, 80),
      profile_band: parsed.profile_band ?? null,
    }
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
      note: clippedText(item.note, 80),
      food_suggestions:
        status === 'low'
          ? Array.isArray(item.food_suggestions) && item.food_suggestions.length
            ? item.food_suggestions
                .map((value) => clippedText(value, 20))
                .filter((value) => value && !FORBIDDEN_SUGGESTION_RE.test(value))
                .slice(0, 3)
            : fallbackSuggestions(id)
          : [],
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
    advice: clippedText(parsed.advice, 80),
  }
}

export function isMicronutrientResultCurrent(taskFingerprint, meals) {
  return taskFingerprint === createMicronutrientFingerprint(meals)
}

function profileAge(birthday) {
  if (!birthday) return null
  const key = String(birthday).slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(key) ? ageFromBirthdayKey(key) : null
}

async function loadDayContext(userId, dayLogId) {
  const [dayResult, mealResult] = await Promise.all([
    query(
      `select dl.*, p.sex, p.birthday::text as birthday
       from day_logs dl
       left join profiles p on p.id = dl.user_id
       where dl.id = $1 and dl.user_id = $2`,
      [dayLogId, userId],
    ),
    query(
      `select id, name, kcal, protein_g, fat_g, carbs_g,
              micronutrients, micronutrients_fingerprint
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

async function writeMealMicronutrients(userId, meal, fingerprint, payload) {
  const { rows } = await query(
    `update meals
     set micronutrients = $3::jsonb,
         micronutrients_fingerprint = $4
     where id = $1 and user_id = $2
       and encode(
         digest(trim(name) || '|' || kcal::text, 'sha256'),
         'hex'
       ) = $4
     returning id`,
    [meal.id, userId, JSON.stringify(payload), fingerprint],
  )
  return Boolean(rows[0])
}

async function loadMealForEstimate(userId, mealId) {
  const { rows } = await query(
    `select id, name, kcal, protein_g, fat_g, carbs_g,
            micronutrients, micronutrients_fingerprint
     from meals
     where id = $1 and user_id = $2`,
    [mealId, userId],
  )
  return rows[0] ?? null
}

async function estimateAndStoreMeal(userId, meal, profile, { force = false } = {}) {
  const current = await loadMealForEstimate(userId, meal.id)
  if (!current) return null
  if (!mealNeedsMicronutrientEstimate(current, { force })) return null

  const fingerprint = createMealMicronutrientFingerprint(current.name, current.kcal)
  const raw = await estimateMealMicronutrients({
    name: current.name,
    kcal: current.kcal,
    protein_g: current.protein_g,
    fat_g: current.fat_g,
    carbs_g: current.carbs_g,
    sex: profile?.sex,
  })
  const payload = normalizeMealMicronutrients(raw)
  await writeMealMicronutrients(userId, current, fingerprint, payload)
  return payload
}

function rollupFromContext(context) {
  return rollupMicronutrientSummary(context.meals, {
    sex: context.dayLog?.sex,
    age: profileAge(context.dayLog?.birthday),
  })
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
  const missing = context.meals.filter((meal) =>
    mealNeedsMicronutrientEstimate(meal, { force }),
  )

  if (missing.length === 0) {
    const summary = rollupFromContext(context)
    await writeReadyIfCurrent(userId, dayLogId, fingerprint, summary)
    return
  }

  if (!pendingAlready) await markPending(userId, dayLogId)

  console.info(
    '[micronutrients] Pro refresh',
    JSON.stringify({
      dayLogId,
      missing: missing.length,
      force,
    }),
  )
  const results = await Promise.allSettled(
    missing.map((meal) =>
      estimateAndStoreMeal(
        userId,
        meal,
        {
          sex: context.dayLog.sex,
        },
        { force },
      ),
    ),
  )
  const failures = results.filter((result) => result.status === 'rejected')
  for (const result of failures) {
    console.warn(
      '[micronutrients] meal estimate failed:',
      result.reason?.code || result.reason?.message || result.reason,
    )
  }

  const latest = await loadDayContext(userId, dayLogId)
  if (!isMicronutrientResultCurrent(fingerprint, latest.meals)) return

  const estimatedCount = latest.meals.filter(
    (meal) => !mealNeedsMicronutrientEstimate(meal),
  ).length
  if (estimatedCount === 0) {
    await writeErrorIfCurrent(
      userId,
      dayLogId,
      fingerprint,
      failures[0]?.reason ?? new Error('微量元素更新失败'),
    )
    return
  }

  const summary = rollupFromContext(latest)
  await writeReadyIfCurrent(userId, dayLogId, fingerprint, summary)
}

export function scheduleMicronutrientRefresh(
  userId,
  dayLogId,
  { pendingAlready = false, force = false } = {},
) {
  const key = `${userId}:${dayLogId}`
  if (!pendingAlready) void markPending(userId, dayLogId)
  const previous = taskChains.get(key) ?? Promise.resolve()
  const task = previous
    .catch(() => undefined)
    .then(() =>
      refreshDay(userId, dayLogId, { pendingAlready: true, force }),
    )
  taskChains.set(key, task)
  void task
    .finally(() => {
      if (taskChains.get(key) === task) taskChains.delete(key)
    })
    .catch(() => undefined)
}

export function pendingIsStale(updatedAt, now = Date.now()) {
  const timestamp = new Date(updatedAt ?? 0).getTime()
  return !Number.isFinite(timestamp) || now - timestamp > PENDING_STALE_MS
}

/**
 * 自动打 Pro 仅限「今天」且尚未成功的餐：idle 或 pending 已超时。
 * 历史日、error、ready 都不自动重打；手动 POST refresh 仍可点。
 */
export function shouldAutoScheduleMicronutrientRefresh({
  needsAi,
  status,
  updatedAt,
  logDate,
  today,
  now = Date.now(),
}) {
  if (!needsAi) return false
  const todayKey = today ?? formatDateKeyInTz()
  if (String(logDate ?? '').slice(0, 10) !== todayKey) return false
  const normalized = status ?? 'idle'
  if (normalized === 'pending') return pendingIsStale(updatedAt, now)
  return normalized === 'idle'
}

function summaryNeedsRollup(dayLog, fingerprint) {
  const summary = parseJsonObject(dayLog.micronutrient_summary)
  return (
    dayLog.micronutrient_status !== 'ready' ||
    dayLog.micronutrient_fingerprint !== fingerprint ||
    Number(summary?.version) !== 2
  )
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
  const needsAi = meals.some((meal) => mealNeedsMicronutrientEstimate(meal))
  if (!needsAi) {
    if (!summaryNeedsRollup(dayLog, fingerprint)) return dayLog
    let sex = dayLog.sex
    let birthday = dayLog.birthday
    if (sex == null && birthday == null) {
      const profileResult = await query(
        `select sex, birthday::text as birthday from profiles where id = $1`,
        [userId],
      )
      sex = profileResult.rows[0]?.sex
      birthday = profileResult.rows[0]?.birthday
    }
    const summary = rollupMicronutrientSummary(meals, {
      sex,
      age: profileAge(birthday),
    })
    const written = await writeReadyIfCurrent(
      userId,
      dayLog.id,
      fingerprint,
      summary,
    )
    if (!written) return dayLog
    return {
      ...dayLog,
      micronutrient_status: 'ready',
      micronutrient_fingerprint: fingerprint,
      micronutrient_summary: summary,
      micronutrient_error: null,
    }
  }

  if (
    !shouldAutoScheduleMicronutrientRefresh({
      needsAi,
      status: dayLog.micronutrient_status,
      updatedAt: dayLog.micronutrient_updated_at,
      logDate: dayLog.log_date,
    })
  ) {
    return dayLog
  }
  const pending = await markPending(userId, dayLog.id)
  scheduleMicronutrientRefresh(userId, dayLog.id, { pendingAlready: true })
  return pending ? { ...dayLog, ...pending } : dayLog
}

export async function requestMicronutrientRefresh(userId, logDate) {
  const { rows } = await query(
    `select dl.*, dl.log_date::text as log_date, p.sex, p.birthday::text as birthday
     from day_logs dl
     left join profiles p on p.id = dl.user_id
     where dl.user_id = $1 and dl.log_date = $2`,
    [userId, logDate],
  )
  const dayLog = rows[0]
  if (!dayLog) return null
  const mealResult = await query(
    `select id, name, kcal, protein_g, fat_g, carbs_g,
            micronutrients, micronutrients_fingerprint
     from meals
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
    force: false,
  })
  return pending ? { ...dayLog, ...pending } : dayLog
}

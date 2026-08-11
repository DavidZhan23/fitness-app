/**
 * DeepSeek 文本估算 provider（默认 deepseek-v4-flash，非 thinking）
 *
 * 2026-07-24 起 deepseek-chat / deepseek-reasoner 已停用。
 */

const API_URL =
  process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/chat/completions'
/** 对齐旧 deepseek-chat：快、非思考 */
export const DEFAULT_DEEPSEEK_MODEL = 'deepseek-v4-flash'
const TIMEOUT_MS = Number(process.env.DEEPSEEK_TIMEOUT_MS || 25_000)

/**
 * 解析可用模型名；旧别名自动映射，避免服务器 .env 未改时继续 400。
 * @param {string} [raw]
 */
export function resolveDeepSeekModel(raw = process.env.DEEPSEEK_MODEL) {
  const model = String(raw ?? '')
    .trim()
    .replace(/^["']|["']$/g, '')
  if (!model || model === 'deepseek-chat') {
    if (model === 'deepseek-chat') {
      console.warn(
        '[deepseek] deepseek-chat 已于 2026-07-24 停用，自动改用 deepseek-v4-flash',
      )
    }
    return DEFAULT_DEEPSEEK_MODEL
  }
  if (model === 'deepseek-reasoner') {
    console.warn(
      '[deepseek] deepseek-reasoner 已于 2026-07-24 停用，自动改用 deepseek-v4-flash（thinking disabled）',
    )
    return DEFAULT_DEEPSEEK_MODEL
  }
  return model
}

/** V4 请求体附加项：显式关闭 thinking，对齐旧 chat 行为 */
export function deepSeekNonThinkingExtras() {
  return { thinking: { type: 'disabled' } }
}

const MAX_HTTP_RETRIES = 3
const RETRYABLE_STATUS = new Set([429, 500, 502, 503])
const MAX_TOKENS = 768
const REASON_MAX_LEN = 60
export const FALLBACK_REASON = '按整体描述估算，可按实际份量调整'

/** 运动 AI 估算：仅增量耗能，供 prompt 与单测断言 */
export const EXERCISE_NET_ACTIVITY_RULES =
  '只估算运动带来的增量消耗（额外耗能），严禁计入基础代谢、静息代谢、BMR、RMR 或同时段内的维持生命体征消耗。' +
  '用户给出的时长/距离/次数仅对应该活动的动态消耗；勿用「时长×全天基础代谢率」或 TDEE 静息部分折算。' +
  '宜用 MET 等思路估净活动耗能（活动 MET 减去 1.0 后按体重与时长计），例如步行 2 小时只估步行额外千卡，不含 2 小时内的基础代谢。' +
  '慢跑、骑车、力量训练等同理；睡觉、久坐、日常维持体征不计入。' +
  'items 的 reason 可简要说明强度/份量假设，并体现为增量运动消耗（非含基础代谢）。'

/**
 * @param {unknown} raw
 * @returns {'high' | 'medium' | 'low'}
 */
export function normalizeConfidence(raw) {
  const v = String(raw ?? '')
    .trim()
    .toLowerCase()
  if (v === 'high' || v === 'medium' || v === 'low') return v
  return 'medium'
}

/**
 * @param {'high' | 'medium' | 'low'} confidence
 */
export function defaultReason(confidence) {
  switch (confidence) {
    case 'high':
      return '按明确份量估算'
    case 'low':
      return '描述较模糊，按普通份量估算'
    default:
      return '按常见份量估算'
  }
}

/**
 * @param {unknown} raw
 * @param {'high' | 'medium' | 'low'} confidence
 */
export function normalizeReason(raw, confidence) {
  let text = String(raw ?? '').trim()
  if (!text) text = defaultReason(confidence)
  const chars = Array.from(text)
  if (chars.length > REASON_MAX_LEN) {
    return chars.slice(0, REASON_MAX_LEN).join('')
  }
  return text
}

export function getDeepSeekApiKey() {
  const raw = process.env.DEEPSEEK_API_KEY
  if (!raw) return ''
  return String(raw).trim().replace(/^["']|["']$/g, '')
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function clampKcal(n) {
  const v = Math.round(Number(n))
  if (!Number.isFinite(v) || v < 1) {
    const err = new Error('AI 返回的热量无效，请改描述后重试')
    err.status = 502
    throw err
  }
  return Math.min(9999, v)
}

function normalizeMacroGram(raw) {
  if (raw == null || raw === '') return undefined
  const value = Number(raw)
  if (!Number.isFinite(value) || value < 0 || value > 10_000) return undefined
  return Math.round(value * 10_000) / 10_000
}

function stripCodeFence(text) {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  return match ? match[1].trim() : text
}

function extractFirstJsonObject(text) {
  const start = text.indexOf('{')
  if (start === -1) return null

  let depth = 0
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i]
    if (ch === '{') depth += 1
    else if (ch === '}') {
      depth -= 1
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1))
        } catch {
          return null
        }
      }
    }
  }
  return null
}

function tryParseJsonObject(text) {
  try {
    const value = JSON.parse(text)
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value
    }
  } catch {
    /* fall through */
  }
  return null
}

/**
 * @param {string} content
 * @returns {{ kcal?: number, items?: unknown[] }}
 */
export function parseEstimatePayload(content) {
  const text = String(content || '').trim()
  if (!text) {
    const err = new Error('AI 未返回内容，请稍后重试')
    err.status = 502
    throw err
  }

  let parsed = tryParseJsonObject(text)
  if (parsed) return parsed

  const unfenced = stripCodeFence(text)
  if (unfenced !== text) {
    parsed = tryParseJsonObject(unfenced.trim())
    if (parsed) return parsed
    parsed = extractFirstJsonObject(unfenced)
    if (parsed) return parsed
  }

  parsed = extractFirstJsonObject(text)
  if (parsed) return parsed

  const numMatch = text.match(/\b(\d{1,4})\b/)
  if (numMatch) return { kcal: Number(numMatch[1]) }

  const err = new Error('无法解析 AI 返回的热量，请改描述后重试')
  err.status = 502
  throw err
}

/**
 * @param {unknown[]} rawItems
 * @param {'meal'|'exercise'} kind
 */
export function normalizeEstimateItems(rawItems, kind) {
  if (!Array.isArray(rawItems)) return []

  const defaultUnit = kind === 'meal' ? '份' : '分钟'
  const out = []

  for (const raw of rawItems) {
    if (!raw || typeof raw !== 'object') continue

    const name = String(raw.name ?? '').trim()
    if (!name) continue

    const quantityRaw = raw.quantity
    const quantity =
      quantityRaw == null || quantityRaw === ''
        ? 1
        : Number(quantityRaw)
    if (!Number.isFinite(quantity) || quantity <= 0) continue

    const unit = String(raw.unit ?? '').trim() || defaultUnit

    // item.kcal = 单位热量（可为小数，如 g 的 kcal/g）；允许 (0, 5000]
    const kcalRaw = Number(raw.kcal)
    if (!Number.isFinite(kcalRaw) || kcalRaw <= 0) continue
    const kcal = Math.min(5000, kcalRaw)

    const confidence = normalizeConfidence(raw.confidence)
    const reason = normalizeReason(raw.reason, confidence)

    const macros =
      kind === 'meal'
        ? {
            protein_g: normalizeMacroGram(raw.protein_g),
            fat_g: normalizeMacroGram(raw.fat_g),
            carbs_g: normalizeMacroGram(raw.carbs_g),
            sugar_g: normalizeMacroGram(raw.sugar_g),
          }
        : {}
    if (
      macros.sugar_g != null &&
      macros.carbs_g != null &&
      macros.sugar_g > macros.carbs_g
    ) {
      macros.sugar_g = macros.carbs_g
    }

    out.push({
      name,
      quantity,
      unit,
      kcal,
      confidence,
      reason,
      ...Object.fromEntries(
        Object.entries(macros).filter(([, value]) => value != null),
      ),
    })
  }

  return out
}

/**
 * @param {{ kcal?: number, items?: unknown[] }} parsed
 * @param {'meal'|'exercise'} kind
 * @param {{ description?: string }} [options]
 * @returns {{
 *   kcal: number,
 *   items?: {
 *     name: string,
 *     quantity: number,
 *     unit: string,
 *     kcal: number,
 *     confidence: 'high' | 'medium' | 'low',
 *     reason: string,
 *   }[],
 * }}
 */
export function buildEstimateResult(parsed, kind, options = {}) {
  const items = normalizeEstimateItems(parsed.items, kind)
  if (items.length >= 1) {
    // 顶层 kcal = Σ round(quantity × 单位热量)
    const kcal = items.reduce(
      (sum, item) => sum + Math.round(item.quantity * item.kcal),
      0,
    )
    return { kcal, items }
  }

  if (parsed.kcal != null) {
    const kcal = clampKcal(parsed.kcal)
    const fallbackName = String(options.description ?? '').trim() || '整体'
    const defaultUnit = kind === 'meal' ? '份' : '分钟'
    return {
      kcal,
      items: [
        {
          name: fallbackName,
          quantity: 1,
          unit: defaultUnit,
          kcal,
          confidence: 'medium',
          reason: FALLBACK_REASON,
        },
      ],
    }
  }

  const err = new Error('无法解析 AI 返回的热量，请改描述后重试')
  err.status = 502
  throw err
}

/** 兼容 content 为空、reasoner 字段、截断等情况 */
function extractMessageContent(choice) {
  const msg = choice?.message
  if (!msg) return ''

  const main = msg.content
  if (main != null && String(main).trim()) return String(main).trim()

  const reasoning = msg.reasoning_content
  if (reasoning != null && String(reasoning).trim()) {
    const num = String(reasoning).match(/\b(\d{1,4})\b/)
    if (num) return String(num[1])
  }

  return ''
}

function buildSystemPrompt(type, profile) {
  const weight = profile?.weight_kg
  const weightHint =
    weight && weight > 0 ? `参考体重约 ${weight} kg。` : '参考普通成年人体重。'

  const itemMacroSchema =
    type === 'meal'
      ? ',"protein_g":单位蛋白质克数,"fat_g":单位脂肪克数,"carbs_g":单位碳水克数,"sugar_g":单位糖克数'
      : ''

  const jsonOnly =
    '只输出一个 JSON object，不要 Markdown，不要代码块，不要解释文字。' +
    `格式：{"kcal":总热量整数,"items":[{"name":"名称","quantity":数量,"unit":"单位","kcal":单位热量${itemMacroSchema},"confidence":"high|medium|low","reason":"简短估算依据"},...]}。` +
    '重要：每条 item 的 kcal 是该 unit 的单位热量（可为小数，如 1.15 表示每 g；78 表示每个），不是整行总热。' +
    '顶层 kcal = 各行 quantity×单位热量之和（取整）。单位热量须 >0 且 ≤5000；quantity 为正数。' +
    'reason 只能是面向用户的简短估算依据（中文 8-40 字，说明份量或单位假设），禁止 chain-of-thought、step-by-step reasoning 或推理过程。' +
    'confidence 规则：明确 g/ml/分钟 → high；一碗/一个/一杯 → medium；一盘/一些/一顿/正常吃了 → low。' +
    '缺单位时 meal 默认 份×1；exercise 默认 分钟或按描述。'

  if (type === 'exercise') {
    return (
      '你是运动增量消耗估算器。将用户中文描述拆成多条运动分别估算千卡。' +
      EXERCISE_NET_ACTIVITY_RULES +
      `${weightHint}单位可用：分钟、小时、km、次、组 等。` +
      jsonOnly
    )
  }

  return (
    '你是饮食摄入估算器。将用户中文描述拆成多条食物分别估算摄入千卡。' +
    '例如「一碗牛肉，一盘鸡蛋」应拆成两条并分别估算。' +
    '饮食 items 还须尽量给出 protein_g、fat_g、carbs_g、sugar_g，表示该 unit 的单位营养素克数；糖是碳水子集，必须 sugar_g≤carbs_g。' +
    `${jsonOnly}单位可用：份、碗、g、ml、个 等。`
  )
}

function buildMinimalUserPrompt(type, description) {
  if (type === 'exercise') {
    return (
      '请估算以下描述的运动增量消耗千卡数（仅活动额外耗能，不含基础代谢/静息代谢）。' +
      `描述：${description}。` +
      '只回复一个正整数，不要任何其他文字或标点。'
    )
  }
  return (
    `请估算以下内容的饮食摄入千卡数。` +
    `描述：${description}。` +
    '只回复一个正整数，不要任何其他文字或标点。'
  )
}

function mapDeepSeekHttpError(status, data) {
  const raw = data?.error?.message || data?.error || ''
  const msg = String(raw)
  if (status === 401 || msg.includes('Authentication') || msg.includes('api key')) {
    return 'AI 密钥无效或已过期，请检查服务器 deploy/.env 中的 DEEPSEEK_API_KEY'
  }
  if (status === 429) return 'AI 请求过于频繁，请 1 分钟后再试'
  if (status === 402 || msg.includes('Insufficient Balance')) {
    return 'DeepSeek 账户余额不足，请充值后重试'
  }
  if (status === 503 || status === 502 || status === 500) {
    return 'DeepSeek 服务暂时繁忙，请稍后重试'
  }
  if (
    status === 400 &&
    (msg.includes('Model Not Exist') ||
      msg.includes('model') ||
      msg.includes('Invalid') ||
      msg.includes('deepseek-chat') ||
      msg.includes('deepseek-reasoner'))
  ) {
    return 'DeepSeek 模型名已失效（deepseek-chat 已停用），请将 DEEPSEEK_MODEL 改为 deepseek-v4-flash 并重建 api'
  }
  if (status === 400 && msg) {
    return `AI 服务返回错误 (400)：${msg}`
  }
  return `AI 服务返回错误 (${status})`
}

async function requestDeepSeekOnce(apiKey, body) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    const data = await res.json().catch(() => ({}))
    return { res, data }
  } catch (e) {
    if (e.name === 'AbortError') {
      const err = new Error('AI 估算超时，请稍后重试')
      err.status = 504
      throw err
    }
    console.error('[deepseek] network', e.message || e)
    const err = new Error(
      '无法连接 DeepSeek（请确认服务器能访问外网 api.deepseek.com）',
    )
    err.status = 502
    throw err
  } finally {
    clearTimeout(timer)
  }
}

async function requestDeepSeekWithRetry(apiKey, body) {
  let lastStatus = 0
  let lastData = {}

  for (let attempt = 0; attempt < MAX_HTTP_RETRIES; attempt++) {
    if (attempt > 0) {
      await sleep(600 * attempt)
      console.warn('[deepseek] retry http', attempt + 1, lastStatus)
    }

    const { res, data } = await requestDeepSeekOnce(apiKey, body)
    if (res.ok) return { res, data }

    lastStatus = res.status
    lastData = data
    console.error('[deepseek] http', res.status, data?.error || data)

    if (res.status === 401 || res.status === 402) break
    if (!RETRYABLE_STATUS.has(res.status)) break
  }

  const err = new Error(mapDeepSeekHttpError(lastStatus, lastData))
  err.status = lastStatus === 503 ? 503 : 502
  throw err
}

function contentPreview(data) {
  const c = extractMessageContent(data?.choices?.[0])
  if (!c) {
    const fr = data?.choices?.[0]?.finish_reason
    return fr ? `(empty, finish_reason=${fr})` : '(empty)'
  }
  return c.length > 120 ? `${c.slice(0, 120)}…` : c
}

function buildPayload({ type, description, profile, mode }) {
  const base = {
    model: resolveDeepSeekModel(),
    max_tokens: MAX_TOKENS,
    temperature: 0.1,
    ...deepSeekNonThinkingExtras(),
  }

  if (mode === 'minimal') {
    return {
      ...base,
      messages: [{ role: 'user', content: buildMinimalUserPrompt(type, description) }],
    }
  }

  const messages = [
    { role: 'system', content: buildSystemPrompt(type, profile) },
    { role: 'user', content: description },
  ]

  if (mode === 'json') {
    return {
      ...base,
      messages,
      response_format: { type: 'json_object' },
    }
  }

  return { ...base, messages }
}

async function tryStrategy(apiKey, options) {
  const kind = options.type === 'meal' ? 'meal' : 'exercise'
  const { data } = await requestDeepSeekWithRetry(
    apiKey,
    buildPayload(options),
  )
  const content = extractMessageContent(data?.choices?.[0])
  if (!content) {
    console.error('[deepseek] empty content', contentPreview(data))
    const err = new Error('AI 未返回内容，请稍后重试')
    err.status = 502
    throw err
  }
  const parsed = parseEstimatePayload(content)
  return buildEstimateResult(parsed, kind, { description: options.description })
}

/**
 * @param {{ type: 'exercise'|'meal', description: string, profile?: { weight_kg?: number|null } }} input
 */
export async function estimateKcalFromDescription(input) {
  const apiKey = getDeepSeekApiKey()
  if (!apiKey) {
    const err = new Error(
      'AI 估算未配置：请在服务器 deploy/.env 设置 DEEPSEEK_API_KEY 后执行 docker compose up -d --build api',
    )
    err.status = 503
    throw err
  }

  const model = resolveDeepSeekModel()
  if (model.includes('reasoner') || model.includes('pro')) {
    console.warn(
      '[deepseek] 当前模型',
      model,
      '；饮食/运动估算建议使用 deepseek-v4-flash 并保持 thinking disabled',
    )
  }

  const type = input.type === 'meal' ? 'meal' : 'exercise'
  const description = String(input.description || '').trim()
  if (description.length < 2) {
    const err = new Error('请填写至少 2 个字的描述')
    err.status = 400
    throw err
  }
  if (description.length > 500) {
    const err = new Error('描述过长，请控制在 500 字以内')
    err.status = 400
    throw err
  }

  const baseOpts = { type, description, profile: input.profile }
  const modes = ['json', 'plain', 'minimal']
  let lastError = 'AI 估算失败，请稍后重试'

  for (const mode of modes) {
    try {
      return await tryStrategy(apiKey, { ...baseOpts, mode })
    } catch (e) {
      lastError = e.message || lastError
      if (e.status === 401 || e.status === 402 || e.status === 504) break
      console.error('[deepseek] strategy failed', mode, e.message)
    }
  }

  const err = new Error(lastError)
  err.status = 502
  throw err
}

export const DEEPSEEK_TEXT_PROVIDER_ID = 'deepseek-text'

/** @type {import('../types.js').KcalEstimator} */
export async function deepseekTextEstimator(input) {
  const result = await estimateKcalFromDescription({
    type: input.kind === 'meal' ? 'meal' : 'exercise',
    description: input.description,
    profile: input.profile,
  })
  return {
    kcal: result.kcal,
    ...(result.items?.length ? { items: result.items } : {}),
    providerId: DEEPSEEK_TEXT_PROVIDER_ID,
  }
}

function normalizeAdviceAmounts(raw, baseTargets) {
  const adjusted = {}
  for (const field of ['protein_g', 'fat_g', 'carbs_g', 'sugar_g']) {
    const base = Number(baseTargets?.[field])
    const value = Number(raw?.[field])
    if (!Number.isFinite(base) || base <= 0) continue
    const min = base * 0.85
    const max = base * 1.15
    adjusted[field] = Math.round(
      Math.min(max, Math.max(min, Number.isFinite(value) ? value : base)),
    )
  }
  if (
    adjusted.sugar_g != null &&
    adjusted.carbs_g != null &&
    adjusted.sugar_g > adjusted.carbs_g
  ) {
    adjusted.sugar_g = adjusted.carbs_g
  }
  return adjusted
}

export async function generateMacroAdvice({ actual, targets }) {
  const apiKey = getDeepSeekApiKey()
  if (!apiKey) {
    const err = new Error('AI 建议未配置，请稍后再试')
    err.status = 503
    throw err
  }
  const safeActual = {}
  const safeTargets = {}
  for (const field of ['protein_g', 'fat_g', 'carbs_g', 'sugar_g']) {
    const actualValue = Number(actual?.[field])
    const targetValue = Number(targets?.[field])
    if (!Number.isFinite(targetValue) || targetValue <= 0) {
      const err = new Error('营养素规则目标无效')
      err.status = 400
      throw err
    }
    safeActual[field] = Math.max(0, Number.isFinite(actualValue) ? actualValue : 0)
    safeTargets[field] = targetValue
  }
  const body = {
    model: resolveDeepSeekModel(),
    max_tokens: 256,
    temperature: 0.2,
    ...deepSeekNonThinkingExtras(),
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          '你是简洁的中文营养建议助手。根据匿名的今日实际克数与规则目标，输出一条不超过60字、非医疗诊断的可执行建议，并可在规则目标上下15%内微调。' +
          '只输出 JSON：{"advice":"短建议","targets":{"protein_g":数字,"fat_g":数字,"carbs_g":数字,"sugar_g":数字}}。',
      },
      {
        role: 'user',
        content: JSON.stringify({ actual: safeActual, ruleTargets: safeTargets }),
      },
    ],
  }
  const { data } = await requestDeepSeekWithRetry(apiKey, body)
  const parsed = parseEstimatePayload(extractMessageContent(data?.choices?.[0]))
  const advice = Array.from(String(parsed?.advice ?? '').trim())
    .slice(0, 60)
    .join('')
  if (!advice) {
    const err = new Error('AI 未返回可用建议，请稍后再试')
    err.status = 502
    throw err
  }
  return {
    advice,
    targets: normalizeAdviceAmounts(parsed.targets, safeTargets),
  }
}

/**
 * DeepSeek 文本估算 provider（deepseek-chat，非 reasoner）
 */

const API_URL =
  process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/chat/completions'
const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat'
const TIMEOUT_MS = Number(process.env.DEEPSEEK_TIMEOUT_MS || 25_000)
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

    const kcalRaw = Math.round(Number(raw.kcal))
    if (!Number.isFinite(kcalRaw) || kcalRaw <= 0) continue
    const kcal = Math.min(5000, Math.max(1, kcalRaw))

    const confidence = normalizeConfidence(raw.confidence)
    const reason = normalizeReason(raw.reason, confidence)

    out.push({ name, quantity, unit, kcal, confidence, reason })
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
    const kcal = items.reduce((sum, item) => sum + item.kcal, 0)
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

  const jsonOnly =
    '只输出一个 JSON object，不要 Markdown，不要代码块，不要解释文字。' +
    '格式：{"kcal":总热量整数,"items":[{"name":"名称","quantity":数量,"unit":"单位","kcal":整数,"confidence":"high|medium|low","reason":"简短估算依据"},...]}。' +
    '每条 item 的 kcal 在 1-5000；quantity 为正数。' +
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
    model: MODEL,
    max_tokens: MAX_TOKENS,
    temperature: 0.1,
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

  if (MODEL.includes('reasoner')) {
    console.warn(
      '[deepseek] DEEPSEEK_MODEL 含 reasoner，易变慢或返回空内容，建议改为 deepseek-chat',
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

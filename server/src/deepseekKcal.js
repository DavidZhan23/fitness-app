/**
 * DeepSeek 快速估算千卡（deepseek-chat，非 reasoner，低 token）
 */

const API_URL =
  process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/chat/completions'
const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat'
const TIMEOUT_MS = Number(process.env.DEEPSEEK_TIMEOUT_MS || 25_000)
const MAX_HTTP_RETRIES = 3
const RETRYABLE_STATUS = new Set([429, 500, 502, 503])

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

function extractKcalFromContent(content) {
  const text = String(content || '').trim()
  if (!text) {
    const err = new Error('AI 未返回内容，请稍后重试')
    err.status = 502
    throw err
  }

  try {
    const j = JSON.parse(text)
    if (j.kcal != null) return clampKcal(j.kcal)
  } catch {
    /* fall through */
  }

  const jsonMatch = text.match(/\{[\s\S]*?"kcal"\s*:\s*(\d+)[\s\S]*?\}/i)
  if (jsonMatch) return clampKcal(jsonMatch[1])

  const numMatch = text.match(/\b(\d{1,4})\b/)
  if (numMatch) return clampKcal(numMatch[1])

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
    if (num) return `{"kcal":${num[1]}}`
  }

  return ''
}

function buildSystemPrompt(type, profile) {
  const weight = profile?.weight_kg
  const weightHint =
    weight && weight > 0 ? `参考体重约 ${weight} kg。` : '参考普通成年人体重。'

  if (type === 'exercise') {
    return (
      '你是运动消耗估算器。根据用户中文描述（运动类型、时长、强度、距离等），' +
      `估算消耗千卡。${weightHint}` +
      '禁止解释。只回复 JSON：{"kcal":整数}，kcal 在 1-5000。'
    )
  }

  return (
    '你是饮食摄入估算器。根据用户中文描述（食物种类、分量、做法），' +
    '估算摄入千卡。禁止解释。只回复 JSON：{"kcal":整数}，kcal 在 1-5000。'
  )
}

function buildMinimalUserPrompt(type, description) {
  const label = type === 'exercise' ? '运动消耗' : '饮食摄入'
  return (
    `请估算以下内容的${label}千卡数。` +
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
    max_tokens: 64,
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
  const { res, data } = await requestDeepSeekWithRetry(
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
  const kcal = extractKcalFromContent(content)
  return kcal
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
      const kcal = await tryStrategy(apiKey, { ...baseOpts, mode })
      return { kcal }
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

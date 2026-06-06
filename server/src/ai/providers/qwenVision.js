/**
 * 通义千问视觉估算 provider（DashScope compatible-mode，饮食拍照识卡路里）
 */

import {
  buildEstimateResult,
  parseEstimatePayload,
} from './deepseekText.js'

const API_URL =
  process.env.DASHSCOPE_API_URL ||
  'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
const MODEL = process.env.KCAL_VISION_MODEL || 'qwen3-vl-flash'
const TIMEOUT_MS = Number(process.env.DASHSCOPE_TIMEOUT_MS || 45_000)
const MAX_HTTP_RETRIES = 3
const RETRYABLE_STATUS = new Set([429, 500, 502, 503])
const MAX_TOKENS = 1024
const MAX_IMAGE_DATA_URL_LENGTH = 1_200_000
const MAX_IMAGES_PER_REQUEST = 6

/** App 内拍摄指引（与前端 mealPhotoGuide.ts 保持一致，供 prompt 引用） */
export const MEAL_PHOTO_SHOOTING_GUIDE =
  '单道菜时手机镜头距食物约 30–40 cm（约前臂长度）；整桌或多菜时约 40–60 cm；' +
  '从斜上方 45°–90° 俯拍，尽量看到碗口或盘面；主要食物约占画面 60%–80%；' +
  '光线充足、避免逆光；若方便，可在旁放置筷子、勺子或常见碗盘作份量参考。'

const JSON_OUTPUT_RULES =
  '只输出一个 JSON object，不要 Markdown，不要代码块，不要解释文字。' +
  '格式：{"kcal":总热量整数,"items":[{"name":"名称","quantity":数量,"unit":"单位","kcal":整数,"confidence":"high|medium|low","reason":"简短估算依据"},...]}。' +
  '每条 item 的 kcal 在 1-5000；quantity 为正数。' +
  'reason 只能是面向用户的简短估算依据（中文 8-40 字，说明份量或单位假设），禁止 chain-of-thought 或推理过程。' +
  'confidence 规则：能看清品种且份量依据充分（如标准碗、明确个数）→ high；' +
  '品种清楚但份量主要靠猜测 → medium；画面模糊/过远/过暗/遮挡严重 → low。' +
  '缺单位时默认 份×1。单位可用：份、碗、盘、g、ml、个 等。'

export function getDashScopeApiKey() {
  const raw = process.env.DASHSCOPE_API_KEY
  if (!raw) return ''
  return String(raw).trim().replace(/^["']|["']$/g, '')
}

export function buildMealVisionSystemPrompt() {
  return (
    '你是中文饮食摄入估算器。用户上传了一张餐食照片，并已按 App 内拍摄指引完成拍摄。' +
    `【App 告知用户的拍摄规范】${MEAL_PHOTO_SHOOTING_GUIDE}` +
    '【你的任务】' +
    '1. 识别图中所有可辨认的食物与饮品（忽略餐具、包装袋、非食物装饰）。' +
    '2. 结合画面中的碗、盘、筷子、勺子、常见中式餐具与上述拍摄距离规范，推断实际可食份量。' +
    '3. 按中国日常家用或外食常见份量，估算每条食物的摄入千卡（仅可食部分）。' +
    '4. 多种食物拆成多条 items；同一类菜若有多份分别可见，分别列出。' +
    '5. 先判断图片质量是否足以估份量：过暗、失焦、距离明显过远、盖子紧闭、食物严重重叠时，应降低 confidence 并保守估算。' +
    '6. 若画面中有参照物（碗沿、标准饭碗、筷子长度等），在 reason 中简要说明如何据此估份量。' +
    '7. 只估算饮食摄入千卡，不涉及运动消耗或基础代谢。' +
    JSON_OUTPUT_RULES
  )
}

/**
 * @param {string} [supplement]
 */
export function buildMealVisionUserPrompt(supplement) {
  const note = String(supplement ?? '').trim()
  const noteLine = note
    ? `用户补充说明：${note}。`
    : '用户未补充文字说明。'
  return (
    '请根据这张餐食照片识别所有食物/饮品，并估算摄入千卡。' +
    `${noteLine}` +
    '请结合拍摄规范（单菜约 30–40 cm、多菜约 40–60 cm、俯拍、食物占画面 60%–80%）判断当前画面是否足以准确估份量；' +
    '若距离过远、模糊或过暗，请在 confidence 与 reason 中如实说明，并给出保守估计。'
  )
}

export function buildMealNutritionLabelSystemPrompt() {
  return (
    '你是中文食品包装营养表 OCR 解析器。用户会上传食品包装或营养成分表照片。' +
    '请优先读取“能量”一行，判断其单位是否为 kJ/100g、千焦/100g、kcal/100g 或每份。' +
    '本 App 手动录入需要字段：食物名称、食用量 g、能量 kJ/100g。' +
    '如果图片中没有食用量，请默认食用量为 100g；如果只有 kcal/100g，请换算成 kJ/100g（1 kcal = 4.184 kJ）。' +
    '如果是每份标注且能读到每份克数，请换算为 kJ/100g。' +
    '只输出一个 JSON object，不要 Markdown，不要代码块。' +
    '格式：{"name":"食品名称","grams":食用量g数字,"kjPer100g":每100g千焦数字,"confidence":"high|medium|low","reason":"简短依据"}。' +
    '无法确定食品名称时 name 用“包装食品”；无法可靠识别能量时 confidence 用 low，但仍给最保守可用数值。'
  )
}

export function buildMealNutritionLabelUserPrompt(supplement) {
  const note = String(supplement ?? '').trim()
  return (
    '请解析这张食品包装营养成分表照片，并返回 App 可自动填入的字段。' +
    (note ? `用户补充说明：${note}。` : '')
  )
}

/**
 * @param {string} dataUrl
 * @returns {{ mime: string, dataUrl: string }}
 */
export function parseMealImageDataUrl(dataUrl) {
  const raw = String(dataUrl ?? '').trim()
  if (!raw) {
    const err = new Error('请上传餐食照片')
    err.status = 400
    throw err
  }
  if (raw.length > MAX_IMAGE_DATA_URL_LENGTH) {
    const err = new Error('图片过大，请换一张更小的照片或重新拍摄')
    err.status = 400
    throw err
  }

  const match = raw.match(/^data:(image\/(?:jpeg|png|webp));base64,([a-z0-9+/=\s]+)$/i)
  if (!match) {
    const err = new Error('图片格式无效，请使用 JPG、PNG 或 WebP')
    err.status = 400
    throw err
  }

  const mime = match[1].toLowerCase()
  const base64 = match[2].replace(/\s/g, '')
  if (base64.length < 32) {
    const err = new Error('图片数据无效，请重新拍摄')
    err.status = 400
    throw err
  }

  return { mime, dataUrl: `data:${mime};base64,${base64}` }
}

export function parseMealImageDataUrls(dataUrls) {
  const list = Array.isArray(dataUrls) ? dataUrls : [dataUrls]
  const cleaned = list.filter((item) => String(item ?? '').trim())
  if (cleaned.length === 0) {
    const err = new Error('请上传餐食照片')
    err.status = 400
    throw err
  }
  if (cleaned.length > MAX_IMAGES_PER_REQUEST) {
    const err = new Error(`一次最多上传 ${MAX_IMAGES_PER_REQUEST} 张图片`)
    err.status = 400
    throw err
  }
  return cleaned.map((item) => parseMealImageDataUrl(item))
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function extractMessageContent(choice) {
  const msg = choice?.message
  if (!msg) return ''
  const main = msg.content
  if (main != null && String(main).trim()) return String(main).trim()
  return ''
}

function mapDashScopeHttpError(status, data) {
  const raw = data?.error?.message || data?.error || ''
  const msg = String(raw)
  if (status === 401 || msg.includes('InvalidApiKey') || msg.includes('api key')) {
    return '视觉 AI 密钥无效，请检查 server/.env 中的 DASHSCOPE_API_KEY'
  }
  if (status === 429) return 'AI 请求过于频繁，请 1 分钟后再试'
  if (
    status === 402 ||
    msg.includes('Insufficient Balance') ||
    msg.includes('Arrearage')
  ) {
    return '阿里云账户余额不足，请充值后重试'
  }
  if (status === 503 || status === 502 || status === 500) {
    return '通义千问服务暂时繁忙，请稍后重试'
  }
  return `视觉 AI 服务返回错误 (${status})`
}

async function requestDashScopeOnce(apiKey, body) {
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
      const err = new Error('拍照识别超时，请稍后重试')
      err.status = 504
      throw err
    }
    console.error('[qwen-vision] network', e.message || e)
    const err = new Error('无法连接通义千问（请确认服务器能访问 dashscope.aliyuncs.com）')
    err.status = 502
    throw err
  } finally {
    clearTimeout(timer)
  }
}

async function requestDashScopeWithRetry(apiKey, body) {
  let lastStatus = 0
  let lastData = {}

  for (let attempt = 0; attempt < MAX_HTTP_RETRIES; attempt++) {
    if (attempt > 0) {
      await sleep(700 * attempt)
      console.warn('[qwen-vision] retry http', attempt + 1, lastStatus)
    }

    const { res, data } = await requestDashScopeOnce(apiKey, body)
    if (res.ok) return { res, data }

    lastStatus = res.status
    lastData = data
    console.error('[qwen-vision] http', res.status, data?.error || data)

    if (res.status === 401 || res.status === 402) break
    if (!RETRYABLE_STATUS.has(res.status)) break
  }

  const err = new Error(mapDashScopeHttpError(lastStatus, lastData))
  err.status = lastStatus === 503 ? 503 : 502
  throw err
}

/**
 * @param {{ imageDataUrl: string, description?: string }} input
 */
export async function estimateMealKcalFromImage(input) {
  const apiKey = getDashScopeApiKey()
  if (!apiKey) {
    const err = new Error(
      '拍照识别未配置：请在 server/.env 设置 DASHSCOPE_API_KEY 后重启 API',
    )
    err.status = 503
    throw err
  }

  const images = parseMealImageDataUrls(input.imageDataUrls ?? input.imageDataUrl)
  const supplement = String(input.description ?? '').trim()
  if (supplement.length > 200) {
    const err = new Error('补充说明请控制在 200 字以内')
    err.status = 400
    throw err
  }

  const body = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    temperature: 0.1,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: buildMealVisionSystemPrompt() },
      {
        role: 'user',
        content: [
          { type: 'text', text: buildMealVisionUserPrompt(supplement) },
          ...images.map(({ dataUrl }) => ({
            type: 'image_url',
            image_url: { url: dataUrl },
          })),
        ],
      },
    ],
  }

  const { data } = await requestDashScopeWithRetry(apiKey, body)
  const content = extractMessageContent(data?.choices?.[0])
  if (!content) {
    const err = new Error('AI 未返回识别结果，请重新拍摄或补充说明后重试')
    err.status = 502
    throw err
  }

  const parsed = parseEstimatePayload(content)
  const fallbackLabel = supplement || '餐食照片'
  return buildEstimateResult(parsed, 'meal', { description: fallbackLabel })
}

/**
 * @param {{ imageDataUrl?: string, imageDataUrls?: string[], description?: string }} input
 */
export async function parseMealNutritionLabelFromImage(input) {
  const apiKey = getDashScopeApiKey()
  if (!apiKey) {
    const err = new Error(
      '拍照识别未配置：请在 server/.env 设置 DASHSCOPE_API_KEY 后重启 API',
    )
    err.status = 503
    throw err
  }

  const images = parseMealImageDataUrls(input.imageDataUrls ?? input.imageDataUrl)
  const supplement = String(input.description ?? '').trim()
  if (supplement.length > 200) {
    const err = new Error('补充说明请控制在 200 字以内')
    err.status = 400
    throw err
  }

  const body = {
    model: MODEL,
    max_tokens: 512,
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: buildMealNutritionLabelSystemPrompt() },
      {
        role: 'user',
        content: [
          { type: 'text', text: buildMealNutritionLabelUserPrompt(supplement) },
          ...images.map(({ dataUrl }) => ({
            type: 'image_url',
            image_url: { url: dataUrl },
          })),
        ],
      },
    ],
  }

  const { data } = await requestDashScopeWithRetry(apiKey, body)
  const content = extractMessageContent(data?.choices?.[0])
  if (!content) {
    const err = new Error('AI 未返回营养表解析结果，请重新拍摄或手动填写')
    err.status = 502
    throw err
  }

  let parsed
  try {
    parsed = JSON.parse(content)
  } catch {
    const err = new Error('AI 返回的营养表结果无法解析，请手动填写')
    err.status = 502
    throw err
  }

  const grams = Number(parsed.grams)
  const kjPer100g = Number(parsed.kjPer100g)
  if (!Number.isFinite(grams) || grams <= 0 || !Number.isFinite(kjPer100g) || kjPer100g <= 0) {
    const err = new Error('未能可靠识别营养表能量，请手动填写')
    err.status = 422
    throw err
  }

  return {
    name: String(parsed.name || '包装食品').trim() || '包装食品',
    grams: Math.round(grams * 10) / 10,
    kjPer100g: Math.round(kjPer100g),
    confidence: ['high', 'medium', 'low'].includes(parsed.confidence)
      ? parsed.confidence
      : 'medium',
    reason: String(parsed.reason || '根据包装营养表识别').trim(),
  }
}

export const QWEN_VISION_PROVIDER_ID = 'qwen-vl-flash'

/** @type {import('../types.js').KcalEstimator} */
export async function qwenVisionEstimator(input) {
  if (input.modality !== 'image') {
    const err = new Error('qwen-vl-flash 仅支持图片识别')
    err.status = 400
    throw err
  }

  const imageDataUrls = input.imageDataUrls?.length
    ? input.imageDataUrls
    : input.imageDataUrl
      ? [input.imageDataUrl]
      : input.images?.length
        ? input.images.map((image) => `data:image/jpeg;base64,${image.toString('base64')}`)
        : []

  const result = await estimateMealKcalFromImage({
    imageDataUrls,
    description: input.description,
  })

  return {
    kcal: result.kcal,
    ...(result.items?.length ? { items: result.items } : {}),
    providerId: QWEN_VISION_PROVIDER_ID,
  }
}

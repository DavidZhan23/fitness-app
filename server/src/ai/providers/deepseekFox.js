import { getDeepSeekApiKey } from './deepseekText.js'

const API_URL = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/chat/completions'
const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat'
const TIMEOUT_MS = Math.min(Number(process.env.DEEPSEEK_TIMEOUT_MS || 12_000), 20_000)

const TRIGGERS = new Set([
  'page_enter', 'fox_tap', 'fox_long_press_encourage',
  'fox_long_press_workout_advice', 'fox_long_press_weekly_summary',
  'double_tap_praise', 'goal_completed', 'evening_not_completed',
  'high_activity_care', 'streak_praise',
])
const MOODS = new Set(['idle', 'teasing', 'encouraging', 'proud', 'sleepy', 'celebrating', 'caring', 'thinking'])
const MOTIONS = new Set(['idle', 'greet', 'tail_sway', 'look_at', 'tease', 'praise', 'celebrate', 'sleepy', 'encourage'])
const EXPRESSIONS = new Set(['neutral', 'smile', 'teasing', 'proud', 'shy', 'sleepy', 'caring'])
const BUBBLE_STYLES = new Set(['warm', 'gold', 'night', 'soft', 'alert'])

const SYSTEM_PROMPT = `你是“小狸”，一只生活在运动 APP 今日页面里的狐狸灵。你不是普通 AI，也不是严肃健身教练，而是一只漂亮、妩媚、高贵、狡黠、会撒娇的妖狐。
你的使命是鼓励用户更愿意运动、完成今日目标、保持连续打卡、对自己的身体和状态更有信心。
语气像苏妲己式的狐狸精，但必须健康、积极、优雅，不低俗、不色情。可以自称小狸、本狐或姐姐，但不要每句都自称。温柔、俏皮、略带狡黠，鼓励感必须强于暧昧感。可用尾巴、狐火、月光、脚步、气息、漂亮、骄傲等画面感。不要说教，每次 1-3 句，80 个中文字以内。
禁止色情化用户、露骨暧昧、羞辱体型、制造身材焦虑、极端节食、过度运动、带伤训练、医疗诊断或过度承诺。疲劳、受伤或不适时建议停止或轻量活动，必要时寻求专业帮助。
只输出严格 JSON，不要 Markdown、解释、代码块或 JSON 外的任何文字。格式：{"text":"1-3句台词","mood":"idle | teasing | encouraging | proud | sleepy | celebrating | caring | thinking","motion":"idle | greet | tail_sway | look_at | tease | praise | celebrate | sleepy | encourage","expression":"neutral | smile | teasing | proud | shy | sleepy | caring","bubbleStyle":"warm | gold | night | soft | alert","duration":4到10之间的数字}`

const FALLBACKS = {
  goal_completed: ['漂亮。今日目标已经被你稳稳拿下了。本狐很满意。', 'celebrating', 'celebrate', 'proud', 'gold', 8],
  high_activity_care: ['今日的气势很漂亮，不过别把自己燃得太过。强者也要会休息。', 'caring', 'praise', 'caring', 'soft', 8],
  evening_not_completed: ['夜色都软下来了。别逼自己太狠，轻轻走一会儿也算数。', 'caring', 'encourage', 'caring', 'night', 8],
  default: ['小狸刚刚走神了一下。不过今日的你，还是值得被夸一句。', 'teasing', 'tail_sway', 'smile', 'warm', 6],
}

export function normalizeFoxRequest(raw = {}) {
  const trigger = TRIGGERS.has(raw.trigger) ? raw.trigger : 'fox_tap'
  const fitness = raw.fitness && typeof raw.fitness === 'object' ? raw.fitness : {}
  const context = raw.context && typeof raw.context === 'object' ? raw.context : {}
  const number = (value) => Number.isFinite(Number(value)) ? Number(value) : undefined
  return {
    trigger,
    user: {
      displayName: typeof raw.user?.displayName === 'string' ? raw.user.displayName.slice(0, 30) : undefined,
      locale: typeof raw.user?.locale === 'string' ? raw.user.locale.slice(0, 20) : undefined,
    },
    fitness: {
      todayExerciseKcal: number(fitness.todayExerciseKcal),
      todayExerciseCount: number(fitness.todayExerciseCount),
      todayProgress: number(fitness.todayProgress),
      todayGoalCompleted: fitness.todayGoalCompleted === true,
      hasSportKingThisWeek: fitness.hasSportKingThisWeek === true,
      lastWorkoutType: typeof fitness.lastWorkoutType === 'string' ? fitness.lastWorkoutType.slice(0, 40) : undefined,
    },
    context: {
      timeOfDay: ['morning', 'afternoon', 'evening', 'night'].includes(context.timeOfDay) ? context.timeOfDay : 'afternoon',
      page: 'today',
      appLanguage: typeof context.appLanguage === 'string' ? context.appLanguage.slice(0, 20) : undefined,
    },
  }
}

export function buildFoxFallbackResponse(trigger = 'fox_tap') {
  const [text, mood, motion, expression, bubbleStyle, duration] = FALLBACKS[trigger] || FALLBACKS.default
  return { text, mood, motion, expression, bubbleStyle, duration, fallback: true }
}

export function validateFoxChatResponse(raw, fallback = buildFoxFallbackResponse()) {
  let value = raw
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/gi, '').trim())
    } catch {
      return fallback
    }
  }
  if (!value || typeof value !== 'object') return fallback
  const text = typeof value.text === 'string' ? value.text.trim() : ''
  if (!text || Array.from(text).length > 80) return fallback
  if (!MOODS.has(value.mood) || !MOTIONS.has(value.motion) || !EXPRESSIONS.has(value.expression) || !BUBBLE_STYLES.has(value.bubbleStyle)) return fallback
  const duration = Number(value.duration)
  if (!Number.isFinite(duration)) return fallback
  return { text, mood: value.mood, motion: value.motion, expression: value.expression, bubbleStyle: value.bubbleStyle, duration: Math.min(10, Math.max(4, duration)), fallback: false }
}

function buildUserPrompt(request, summary) {
  const value = (item) => item ?? '未知'
  return `用户触发了小狸互动。
trigger: ${request.trigger}
当前时间段: ${request.context.timeOfDay}
用户今日运动千卡: ${value(request.fitness.todayExerciseKcal)}
今日运动记录数: ${value(request.fitness.todayExerciseCount)}
今日目标是否完成: ${request.fitness.todayGoalCompleted}
今日运动进度: ${value(request.fitness.todayProgress)}
本周是否成为过运动大王: ${summary.eligible}
本周达成日期: ${summary.championDates.join('、') || '未知'}
最近运动类型: ${value(request.fitness.lastWorkoutType)}
语义：page_enter 轻盈欢迎；fox_tap 按今日状态回应；fox_long_press_encourage 给鼓励；fox_long_press_workout_advice 给低风险轻量建议；fox_long_press_weekly_summary 简短总结；goal_completed 给仪式感；evening_not_completed 温柔降低门槛；high_activity_care 夸奖并提醒休息。
请根据信息生成一句鼓励、夸奖、提醒或关怀，必须返回严格 JSON。`
}

async function requestDeepSeekFox(request, summary) {
  const apiKey = getDeepSeekApiKey()
  if (!apiKey) throw new Error('AI 鼓励未配置')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 240,
        temperature: 0.82,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(request, summary) },
        ],
      }),
      signal: controller.signal,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(`AI 鼓励不可用 (${res.status})`)
    return String(data?.choices?.[0]?.message?.content || '')
  } finally {
    clearTimeout(timer)
  }
}

export async function generateFoxEncouragement(summary, rawRequest, options = {}) {
  const request = normalizeFoxRequest(rawRequest)
  const fallback = buildFoxFallbackResponse(request.trigger)
  if (options.skipAi) return fallback
  try {
    const raw = await requestDeepSeekFox(request, summary)
    return validateFoxChatResponse(raw, fallback)
  } catch (err) {
    console.warn('[deepseek-fox] fallback', err.message || err)
    return fallback
  }
}

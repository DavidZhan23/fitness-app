export type FoxMood =
  | 'hidden'
  | 'hint'
  | 'entering'
  | 'idle'
  | 'waiting'
  | 'sleepy'
  | 'teasing'
  | 'encouraging'
  | 'proud'
  | 'celebrating'
  | 'thinking'
  | 'speaking'
  | 'caring'
  | 'error'

export type FoxMotion =
  | 'idle'
  | 'greet'
  | 'tail_sway'
  | 'look_at'
  | 'tease'
  | 'praise'
  | 'celebrate'
  | 'sleepy'
  | 'encourage'

export type FoxExpression =
  | 'neutral'
  | 'smile'
  | 'teasing'
  | 'proud'
  | 'shy'
  | 'sleepy'
  | 'caring'

export type FoxBubbleStyle = 'warm' | 'gold' | 'night' | 'soft' | 'alert'

export type FoxTrigger =
  | 'page_enter'
  | 'fox_tap'
  | 'fox_long_press_encourage'
  | 'fox_long_press_workout_advice'
  | 'fox_long_press_weekly_summary'
  | 'double_tap_praise'
  | 'goal_completed'
  | 'evening_not_completed'
  | 'high_activity_care'
  | 'streak_praise'

export interface FoxChatResponse {
  text: string
  mood: Exclude<FoxMood, 'hidden' | 'hint' | 'entering' | 'waiting' | 'speaking' | 'error'> | 'thinking'
  motion: FoxMotion
  expression: FoxExpression
  bubbleStyle: FoxBubbleStyle
  duration: number
  fallback?: boolean
}

export interface FoxFitnessContext {
  todayExerciseKcal?: number
  todayExerciseCount?: number
  todayProgress?: number
  todayGoalCompleted?: boolean
  hasSportKingThisWeek?: boolean
  lastWorkoutType?: string
}

const moods = new Set(['idle', 'teasing', 'encouraging', 'proud', 'sleepy', 'celebrating', 'caring', 'thinking'])
const motions = new Set(['idle', 'greet', 'tail_sway', 'look_at', 'tease', 'praise', 'celebrate', 'sleepy', 'encourage'])
const expressions = new Set(['neutral', 'smile', 'teasing', 'proud', 'shy', 'sleepy', 'caring'])
const bubbleStyles = new Set(['warm', 'gold', 'night', 'soft', 'alert'])

export function validateFoxChatResponse(raw: unknown): FoxChatResponse | null {
  const value = typeof raw === 'string' ? safeParse(raw) : raw
  if (!value || typeof value !== 'object') return null
  const candidate = value as Record<string, unknown>
  const text = typeof candidate.text === 'string' ? candidate.text.trim() : ''
  if (!text || Array.from(text).length > 80) return null
  if (!moods.has(String(candidate.mood))) return null
  if (!motions.has(String(candidate.motion))) return null
  if (!expressions.has(String(candidate.expression))) return null
  if (!bubbleStyles.has(String(candidate.bubbleStyle))) return null
  const duration = Number(candidate.duration)
  if (!Number.isFinite(duration)) return null
  return {
    text,
    mood: candidate.mood as FoxChatResponse['mood'],
    motion: candidate.motion as FoxMotion,
    expression: candidate.expression as FoxExpression,
    bubbleStyle: candidate.bubbleStyle as FoxBubbleStyle,
    duration: Math.min(10, Math.max(4, duration)),
    fallback: candidate.fallback === true,
  }
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

import { resolveProfileMetabolism } from './calories'
import {
  calculateDeficitByMode,
  getMetabolismByMode,
} from './metabolism'
import { formatDateKey } from './streaks'
import type { CommunityDaySnapshot, Profile } from '../types'

/** 与「今日」页相同的缺口算法（浏览器本地时区） */
export function computeCommunityDeficit(
  snapshot: CommunityDaySnapshot,
  options?: {
    viewerProfile?: Profile | null
    isSelf?: boolean
    now?: Date
  },
): number {
  const now = options?.now ?? new Date()
  const todayKey = formatDateKey(now)
  let dailyBmr = snapshot.dailyBmr
  let metabolismMode = snapshot.metabolismMode
  if (options?.isSelf && options.viewerProfile) {
    dailyBmr = resolveProfileMetabolism(options.viewerProfile).bmr
    metabolismMode = options.viewerProfile.metabolism_mode
  }
  const historicalWithoutMeal = snapshot.date !== todayKey && snapshot.mealKcal <= 0
  const bmrForDeficit = historicalWithoutMeal ? 0 : dailyBmr
  const at =
    snapshot.date === todayKey ? now : new Date(`${snapshot.date}T23:59:59`)
  return calculateDeficitByMode(
    bmrForDeficit,
    snapshot.exerciseKcal,
    snapshot.mealKcal,
    snapshot.date,
    snapshot.date === todayKey ? metabolismMode : 'full_day',
    at,
  )
}

export function computeCommunityMetabolism(
  snapshot: CommunityDaySnapshot,
  options?: {
    viewerProfile?: Profile | null
    isSelf?: boolean
    now?: Date
  },
): number {
  const now = options?.now ?? new Date()
  const todayKey = formatDateKey(now)
  let dailyBmr = snapshot.dailyBmr
  let metabolismMode = snapshot.metabolismMode
  if (options?.isSelf && options.viewerProfile) {
    dailyBmr = resolveProfileMetabolism(options.viewerProfile).bmr
    metabolismMode = options.viewerProfile.metabolism_mode
  }
  const historicalWithoutMeal = snapshot.date !== todayKey && snapshot.mealKcal <= 0
  const bmrForMetabolism = historicalWithoutMeal ? 0 : dailyBmr
  const at =
    snapshot.date === todayKey ? now : new Date(`${snapshot.date}T23:59:59`)
  return getMetabolismByMode(
    bmrForMetabolism,
    snapshot.date,
    snapshot.date === todayKey ? metabolismMode : 'full_day',
    at,
  )
}

import { resolveProfileMetabolism } from './calories'
import {
  calculateSpreadDeficit,
  getAccumulatedMetabolism,
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
  if (options?.isSelf && options.viewerProfile) {
    dailyBmr = resolveProfileMetabolism(options.viewerProfile).bmr
  }
  const at =
    snapshot.date === todayKey ? now : new Date(`${snapshot.date}T23:59:59`)
  return calculateSpreadDeficit(
    dailyBmr,
    snapshot.exerciseKcal,
    snapshot.mealKcal,
    snapshot.date,
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
  if (options?.isSelf && options.viewerProfile) {
    dailyBmr = resolveProfileMetabolism(options.viewerProfile).bmr
  }
  const at =
    snapshot.date === todayKey ? now : new Date(`${snapshot.date}T23:59:59`)
  return getAccumulatedMetabolism(dailyBmr, snapshot.date, at)
}

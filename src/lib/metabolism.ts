/** 将全日 TDEE 均匀摊到每一分钟的基础代谢 */

import { toKcal } from './calories'
import type { MetabolismMode } from '../types'

/** 与设置页「基础代谢计入方式」选项图标一致 */
export const METABOLISM_MODE_ICON: Record<MetabolismMode, string> = {
  full_day: '☀',
  time_spread: '◷',
}

export const METABOLISM_MODE_LABEL: Record<MetabolismMode, string> = {
  full_day: '全天计入',
  time_spread: '随时间累计',
}

const MINUTES_PER_DAY = 24 * 60

export function getMetabolismPerMinute(tdee: number): number {
  tdee = toKcal(tdee)
  if (tdee <= 0) return 0
  return tdee / MINUTES_PER_DAY
}

/** 某日已过去的分钟数（当日用 now；历史日视为全天结束） */
export function getMinutesElapsedForDate(
  dateKey: string,
  now: Date = new Date(),
): number {
  const [y, m, d] = dateKey.split('-').map(Number)
  const dayStart = new Date(y, m - 1, d, 0, 0, 0, 0)
  const dayEnd = new Date(y, m - 1, d, 23, 59, 59, 999)

  if (now < dayStart) return 0
  if (now > dayEnd) return MINUTES_PER_DAY

  const elapsed = Math.floor((now.getTime() - dayStart.getTime()) / 60_000)
  return Math.min(Math.max(elapsed, 0), MINUTES_PER_DAY)
}

/** 截至当前时刻、按分钟均匀累计的基础代谢（非一次性计入全天） */
export function getAccumulatedMetabolism(
  tdee: number,
  dateKey: string,
  now: Date = new Date(),
): number {
  const minutes = getMinutesElapsedForDate(dateKey, now)
  return Math.round(getMetabolismPerMinute(tdee) * minutes)
}

export function normalizeMetabolismMode(
  mode: MetabolismMode | null | undefined,
): MetabolismMode {
  return mode === 'time_spread' ? 'time_spread' : 'full_day'
}

/** 按用户偏好取得某日计入的基础代谢；历史日始终按全天，未来日为 0。 */
export function getMetabolismByMode(
  dailyBmr: number,
  dateKey: string,
  mode: MetabolismMode | null | undefined,
  now: Date = new Date(),
): number {
  const minutes = getMinutesElapsedForDate(dateKey, now)
  if (minutes >= MINUTES_PER_DAY) return Math.round(toKcal(dailyBmr))
  if (now < new Date(`${dateKey}T00:00:00`)) return 0
  return normalizeMetabolismMode(mode) === 'full_day'
    ? Math.round(toKcal(dailyBmr))
    : getAccumulatedMetabolism(dailyBmr, dateKey, now)
}

export function calculateSpreadDeficit(
  tdee: number,
  exerciseKcal: number,
  mealKcal: number,
  dateKey: string,
  now: Date = new Date(),
): number {
  const accumulated = getAccumulatedMetabolism(tdee, dateKey, now)
  return Math.round(
    accumulated + toKcal(exerciseKcal) - toKcal(mealKcal),
  )
}

export function calculateDeficitByMode(
  dailyBmr: number,
  exerciseKcal: number,
  mealKcal: number,
  dateKey: string,
  mode: MetabolismMode | null | undefined,
  now: Date = new Date(),
): number {
  return Math.round(
    getMetabolismByMode(dailyBmr, dateKey, mode, now) +
      toKcal(exerciseKcal) -
      toKcal(mealKcal),
  )
}

/** 展示用：今日 vs 历史日 */
export function getMetabolismStatLabel(dateKey: string, todayKey: string): string {
  return dateKey === todayKey ? '基础代谢' : '基础代谢'
}

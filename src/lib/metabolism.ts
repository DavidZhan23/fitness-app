/** 将全日 TDEE 均匀摊到每一分钟的基础代谢 */

import { toKcal } from './calories'

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

/** 展示用：今日 vs 历史日 */
export function getMetabolismStatLabel(dateKey: string, todayKey: string): string {
  return dateKey === todayKey ? '基础代谢' : '基础代谢'
}

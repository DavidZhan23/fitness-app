import { toKcal } from './calories.js'

const MINUTES_PER_DAY = 24 * 60

function getMetabolismPerMinute(tdee) {
  tdee = toKcal(tdee)
  if (tdee <= 0) return 0
  return tdee / MINUTES_PER_DAY
}

export function getMinutesElapsedForDate(dateKey, now = new Date()) {
  const [y, m, d] = dateKey.split('-').map(Number)
  const dayStart = new Date(y, m - 1, d, 0, 0, 0, 0)
  const dayEnd = new Date(y, m - 1, d, 23, 59, 59, 999)
  if (now < dayStart) return 0
  if (now > dayEnd) return MINUTES_PER_DAY
  const elapsed = Math.floor((now.getTime() - dayStart.getTime()) / 60_000)
  return Math.min(Math.max(elapsed, 0), MINUTES_PER_DAY)
}

export function getAccumulatedMetabolism(tdee, dateKey, now = new Date()) {
  const minutes = getMinutesElapsedForDate(dateKey, now)
  return Math.round(getMetabolismPerMinute(tdee) * minutes)
}

export function normalizeMetabolismMode(mode) {
  return mode === 'time_spread' ? 'time_spread' : 'full_day'
}

export function getMetabolismByMode(
  dailyBmr,
  dateKey,
  mode,
  now = new Date(),
) {
  const minutes = getMinutesElapsedForDate(dateKey, now)
  if (minutes >= MINUTES_PER_DAY) return Math.round(toKcal(dailyBmr))
  if (now < new Date(`${dateKey}T00:00:00`)) return 0
  return normalizeMetabolismMode(mode) === 'full_day'
    ? Math.round(toKcal(dailyBmr))
    : getAccumulatedMetabolism(dailyBmr, dateKey, now)
}

export function calculateSpreadDeficit(
  dailyBmr,
  exerciseKcal,
  mealKcal,
  dateKey,
  now = new Date(),
) {
  const accumulated = getAccumulatedMetabolism(dailyBmr, dateKey, now)
  return Math.round(accumulated + toKcal(exerciseKcal) - toKcal(mealKcal))
}

export function calculateDeficitByMode(
  dailyBmr,
  exerciseKcal,
  mealKcal,
  dateKey,
  mode,
  now = new Date(),
) {
  return Math.round(
    getMetabolismByMode(dailyBmr, dateKey, mode, now) +
      toKcal(exerciseKcal) -
      toKcal(mealKcal),
  )
}

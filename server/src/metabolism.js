import { toKcal } from './calories.js'
import {
  formatDateKeyInTz,
  getMinutesElapsedForDateInTz,
} from './dateKey.js'

const MINUTES_PER_DAY = 24 * 60

function getMetabolismPerMinute(tdee) {
  tdee = toKcal(tdee)
  if (tdee <= 0) return 0
  return tdee / MINUTES_PER_DAY
}

export function getMinutesElapsedForDate(dateKey, now = new Date()) {
  return getMinutesElapsedForDateInTz(dateKey, now)
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
  const today = formatDateKeyInTz(now)
  if (dateKey < today || minutes >= MINUTES_PER_DAY) {
    return Math.round(toKcal(dailyBmr))
  }
  if (dateKey > today) return 0
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

import type { IntensityLevel } from './monthCalendar'
import {
  getDeficitIntensityLevel,
  getExerciseIntensityLevel,
  toKcal,
} from './calories'
import { calculateSpreadDeficit } from './metabolism'
import { isBeforeAccountStart, normalizeDateKey } from './streaks'
import type { DayLog } from '../types'

export interface MonthDayCell {
  date: string
  exerciseLevel: IntensityLevel
  deficitLevel: IntensityLevel
  exerciseKcal: number
  deficit: number
  /** 注册日之前，代谢缺口不计入 */
  beforeAccount?: boolean
}

export function buildMonthDayMap(
  logs: DayLog[],
  threshold: number,
  todayKey: string,
  accountStartKey: string | null,
  dailyBmr: number,
): Map<string, MonthDayCell> {
  const map = new Map<string, MonthDayCell>()

  for (const log of logs) {
    const dateKey = normalizeDateKey(String(log.log_date))
    const exerciseKcal = toKcal(log.exercise_kcal)
    const mealKcal = toKcal(log.meal_kcal)
    const beforeAccount = isBeforeAccountStart(dateKey, accountStartKey)

    const endOfDay = new Date(`${dateKey}T23:59:59`)
    let deficit = beforeAccount
      ? 0
      : dateKey === todayKey
        ? calculateSpreadDeficit(dailyBmr, exerciseKcal, mealKcal, dateKey)
        : calculateSpreadDeficit(
            dailyBmr,
            exerciseKcal,
            mealKcal,
            dateKey,
            endOfDay,
          )

    let deficitLevel: IntensityLevel = beforeAccount
      ? 0
      : getDeficitIntensityLevel(deficit, threshold)

    map.set(dateKey, {
      date: dateKey,
      exerciseKcal,
      deficit,
      exerciseLevel: getExerciseIntensityLevel(exerciseKcal),
      deficitLevel,
      beforeAccount,
    })
  }

  return map
}

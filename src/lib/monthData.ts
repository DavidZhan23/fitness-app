import type { IntensityLevel } from './monthCalendar'
import {
  getDeficitIntensityLevel,
  getExerciseIntensityLevel,
} from './calories'
import { calculateSpreadDeficit } from './metabolism'
import type { DayLog } from '../types'

export interface MonthDayCell {
  date: string
  exerciseLevel: IntensityLevel
  deficitLevel: IntensityLevel
  exerciseKcal: number
  deficit: number
}

export function buildMonthDayMap(
  logs: DayLog[],
  threshold: number,
  todayKey: string,
): Map<string, MonthDayCell> {
  const map = new Map<string, MonthDayCell>()

  for (const log of logs) {
    const exerciseKcal = Number(log.exercise_kcal)
    const mealKcal = Number(log.meal_kcal)
    const tdee = Number(log.tdee_snapshot)
    const endOfDay = new Date(`${log.log_date}T23:59:59`)
    const deficit =
      log.log_date === todayKey
        ? calculateSpreadDeficit(tdee, exerciseKcal, mealKcal, log.log_date)
        : calculateSpreadDeficit(tdee, exerciseKcal, mealKcal, log.log_date, endOfDay)

    map.set(log.log_date, {
      date: log.log_date,
      exerciseKcal,
      deficit,
      exerciseLevel: getExerciseIntensityLevel(exerciseKcal),
      deficitLevel: getDeficitIntensityLevel(deficit, threshold),
    })
  }

  return map
}

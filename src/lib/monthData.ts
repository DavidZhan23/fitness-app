import {
  resolveDeficitGridBadge,
  resolveExerciseGridBadge,
  type DeficitGridDayBadge,
  type ExerciseGridDayBadge,
} from './communityBadges'
import type { IntensityLevel } from './monthCalendar'
import {
  getDeficitHeatmapCell,
  getExerciseIntensityLevel,
  toKcal,
} from './calories'
import type { DeficitHeatmapTone } from './calories'
import { calculateSpreadDeficit } from './metabolism'
import { isBeforeAccountStart, normalizeDateKey } from './streaks'
import type { DayLog } from '../types'

export interface MonthDayCell {
  date: string
  exerciseLevel: IntensityLevel
  deficitLevel: IntensityLevel
  deficitTone: DeficitHeatmapTone
  exerciseKcal: number
  mealKcal: number
  deficit: number
  /** 注册日之前，代谢缺口不计入 */
  beforeAccount?: boolean
  exerciseDayBadge?: ExerciseGridDayBadge | null
  deficitDayBadge?: DeficitGridDayBadge | null
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
    const deficit = beforeAccount
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

    const heatmap = beforeAccount
      ? { level: 0 as IntensityLevel, tone: 'neutral' as DeficitHeatmapTone }
      : getDeficitHeatmapCell(deficit, threshold)

    const badgeInput = { deficit, exerciseKcal, mealKcal, dailyBmr }
    const exerciseDayBadge = beforeAccount
      ? null
      : resolveExerciseGridBadge(badgeInput)
    const deficitDayBadge = beforeAccount
      ? null
      : resolveDeficitGridBadge(badgeInput)

    map.set(dateKey, {
      date: dateKey,
      exerciseKcal,
      mealKcal,
      deficit,
      exerciseLevel: getExerciseIntensityLevel(exerciseKcal),
      deficitLevel: heatmap.level,
      deficitTone: heatmap.tone,
      beforeAccount,
      exerciseDayBadge,
      deficitDayBadge,
    })
  }

  return map
}

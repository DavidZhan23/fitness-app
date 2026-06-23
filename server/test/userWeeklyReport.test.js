import { describe, expect, it } from 'vitest'
import {
  buildWeeklyReportSnapshot,
  generateNextWeekSuggestions,
  generateWeeklyFoxComment,
  getPreviousWeekRange,
  isPublishableUserWeeklyReport,
  isoWeekInfo,
  levelForAverageDeficit,
  rowDateKey,
  weekHasReportableActivity,
} from '../src/userWeeklyReport.js'

const profile = {
  weight_kg: 70,
  height_cm: 175,
  age: 30,
  sex: 'male',
  activity_factor: 1.2,
}

describe('user weekly report', () => {
  it('calculates previous Monday through Sunday across year boundary', () => {
  expect(getPreviousWeekRange(new Date('2026-01-05T04:00:00Z'))).toEqual({
    weekStartDate: '2025-12-29',
    weekEndDate: '2026-01-04',
    year: 2026,
    weekNumber: 1,
  })
  expect(isoWeekInfo('2025-12-29')).toEqual({ year: 2026, weekNumber: 1 })
  })

  it('builds an insufficient snapshot for an empty week without publishing', () => {
  const report = buildWeeklyReportSnapshot({
    userId: 'user-1',
    weekStartDate: '2026-06-08',
    weekEndDate: '2026-06-14',
    year: 2026,
    weekNumber: 24,
    profile,
    generatedAt: '2026-06-15T00:00:00.000Z',
  })
  expect(report.summary.dataStatus).toBe('insufficient')
  expect(isPublishableUserWeeklyReport(report)).toBe(false)
  expect(report.summary.activeDays).toBe(0)
  expect(report.calorieStats.deficitLevel).toBe('unknown')
  expect(report.calorieStats.dailyCalories).toHaveLength(7)
  expect(report.foxComment).toMatch(/足够多/)
  })

  it('requires reportable activity before a week qualifies for a report', () => {
  expect(weekHasReportableActivity([], [], [])).toBe(false)
  expect(weekHasReportableActivity([], [{ log_date: '2026-06-08', name: '跑步', kcal: 100 }], [])).toBe(true)
  expect(weekHasReportableActivity([], [], [{ log_date: '2026-06-08', name: '饭', kcal: 400 }])).toBe(true)
  expect(weekHasReportableActivity([{ log_date: '2026-06-08', exercise_kcal: 120 }], [], [])).toBe(true)
  })

  it('rowDateKey normalizes pg Date objects instead of slicing locale strings', () => {
  expect(rowDateKey(new Date('2026-06-08T00:00:00.000Z'))).toBe('2026-06-08')
  expect(rowDateKey('2026-06-08T00:00:00.000Z')).toBe('2026-06-08')
  expect(rowDateKey('Mon Jun 08')).toBe('')
  })

  it('aggregates exercise, meals, deficits, favorites and achievements', () => {
  const report = buildWeeklyReportSnapshot({
    userId: 'user-1',
    weekStartDate: '2026-06-08',
    weekEndDate: '2026-06-14',
    year: 2026,
    weekNumber: 24,
    profile,
    logs: [
      { log_date: '2026-06-08' },
      { log_date: '2026-06-09' },
    ],
    exercises: [
      { log_date: '2026-06-08', name: '跑步', kcal: 650 },
      { log_date: '2026-06-09', name: '跑步', kcal: 200 },
      { log_date: '2026-06-09', name: '散步', kcal: 80 },
    ],
    meals: [
      { log_date: '2026-06-08', name: '鸡胸肉', kcal: 500 },
      { log_date: '2026-06-08', name: '米饭', kcal: 450 },
      { log_date: '2026-06-09', name: '鸡胸肉', kcal: 600 },
    ],
  })
  expect(report.summary.activeDays).toBe(2)
  expect(isPublishableUserWeeklyReport(report)).toBe(true)
  expect(report.exerciseStats.totalWorkouts).toBe(3)
  expect(report.exerciseStats.favoriteExerciseName).toBe('跑步')
  expect(report.dietStats.favoriteFood).toBe('鸡胸肉')
  expect(report.dietStats.highestCalorieFood).toBe('鸡胸肉')
  expect(report.calorieStats.trackedDeficitDays).toBe(2)
  expect(report.exerciseStats.totalMinutes).toBeNull()
  expect(report.dietStats.totalProtein).toBeNull()
  expect(report.nextWeekSuggestions).toHaveLength(3)
  })

  it('keeps missing BMR deficit unknown and suggestions bounded', () => {
  const report = buildWeeklyReportSnapshot({
    userId: 'user-1',
    weekStartDate: '2026-06-08',
    weekEndDate: '2026-06-14',
    year: 2026,
    weekNumber: 24,
    profile: {},
    logs: [{ log_date: '2026-06-08' }],
    meals: [{ log_date: '2026-06-08', name: '面条', kcal: 600 }],
  })
  expect(report.calorieStats.dailyCalories[0].status).toBe('unknown')
  expect(report.calorieStats.totalDeficit).toBeNull()
  expect(generateNextWeekSuggestions(report).length).toBeLessThanOrEqual(3)
  expect(generateWeeklyFoxComment(report).length).toBeGreaterThan(10)
  })

  it('classifies weekly average deficit levels', () => {
  expect(levelForAverageDeficit(null, false)).toBe('unknown')
  expect(levelForAverageDeficit(100)).toBe('too_low')
  expect(levelForAverageDeficit(200)).toBe('mild')
  expect(levelForAverageDeficit(500)).toBe('good')
  expect(levelForAverageDeficit(900)).toBe('aggressive')
  })
})

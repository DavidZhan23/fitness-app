import { describe, expect, it } from 'vitest'
import { formatWeeklyDateLabel, normalizeUserWeeklyReport } from '../userWeeklyReport'
import type { UserWeeklyReport } from '../../types'

describe('normalizeUserWeeklyReport', () => {
  it('fills missing nested arrays so detail page can render safely', () => {
    const raw = {
      id: 'report-1',
      userId: 'user-1',
      weekStartDate: '2026-06-08',
      weekEndDate: '2026-06-14',
      weekNumber: 24,
      year: 2026,
      generatedAt: '2026-06-15T00:00:00.000Z',
      isViewed: false,
      summary: { activeDays: 2 },
      exerciseStats: { totalWorkouts: 1 },
      dietStats: { loggedDays: 1 },
      calorieStats: { deficitLevel: 'mild' },
      achievementStats: { exerciseKingCount: 1 },
    } as unknown as UserWeeklyReport

    const report = normalizeUserWeeklyReport(raw)
    expect(report).not.toBeNull()
    expect(report?.calorieStats.dailyCalories).toEqual([])
    expect(report?.exerciseStats.exerciseTypeDistribution).toEqual([])
    expect(report?.achievementStats.dailyAchievements).toEqual([])
    expect(report?.nextWeekSuggestions).toEqual([])
    expect(report?.summary.overallTitle).toBe('小满周报')
  })
})

describe('formatWeeklyDateLabel', () => {
  it('returns em dash for invalid locale date strings', () => {
    expect(formatWeeklyDateLabel('Mon Jun 08')).toBe('—')
    expect(formatWeeklyDateLabel(undefined)).toBe('—')
  })

  it('formats valid YYYY-MM-DD keys', () => {
    expect(formatWeeklyDateLabel('2026-06-08')).toMatch(/8/)
    expect(formatWeeklyDateLabel('2026-06-08', 'short')).toMatch(/6/)
  })
})

import { describe, expect, it, vi } from 'vitest'

const { loadProfileMock } = vi.hoisted(() => ({
  loadProfileMock: vi.fn(),
}))

vi.mock('../src/community.js', () => ({
  assertCanViewCommunity: vi.fn(),
  loadProfile: loadProfileMock,
}))

import {
  buildWeeklyReportSnapshot,
  buildWeeklyInsights,
  generateNextWeekSuggestions,
  generateWeeklyFoxComment,
  getPreviousWeekRange,
  isPublishableUserWeeklyReport,
  isoWeekInfo,
  levelForAverageDeficit,
  listCommunitySharedWeeklyReports,
  regenerateUserWeeklyReport,
  rowDateKey,
  validateWeeklyNarrative,
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
  expect(report.foxComment).toMatch(/0\/7/)
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

  it('does not suggest a five-day recording challenge after diet already covers five days', () => {
    const meals = Array.from({ length: 5 }, (_, index) => ({
      log_date: `2026-06-${String(8 + index).padStart(2, '0')}`,
      name: '家常饭',
      kcal: 700,
    }))
    const report = buildWeeklyReportSnapshot({
      userId: 'user-1',
      weekStartDate: '2026-06-08',
      weekEndDate: '2026-06-14',
      year: 2026,
      weekNumber: 24,
      profile,
      meals,
    })
    expect(report.summary.dietLoggedDays).toBe(5)
    expect(JSON.stringify(report.nextWeekSuggestions)).not.toMatch(/记录五天|记录 5 天|挑战.*5 天/)
  })

  it('prioritizes recovery when the weekly deficit is aggressive', () => {
    const meals = Array.from({ length: 7 }, (_, index) => ({
      log_date: `2026-06-${String(8 + index).padStart(2, '0')}`,
      name: '简餐',
      kcal: 300,
    }))
    const report = buildWeeklyReportSnapshot({
      userId: 'user-1',
      weekStartDate: '2026-06-08',
      weekEndDate: '2026-06-14',
      year: 2026,
      weekNumber: 24,
      profile,
      meals,
    })
    expect(report.calorieStats.deficitLevel).toBe('aggressive')
    expect(report.nextWeekSuggestions[0].type).toBe('recovery')
    expect(report.nextWeekSuggestions.some((item) => item.type === 'exercise')).toBe(false)
  })

  it('produces different fact comments and suggestions for different weeks', () => {
    const quiet = buildWeeklyReportSnapshot({
      userId: 'user-1',
      weekStartDate: '2026-06-08',
      weekEndDate: '2026-06-14',
      year: 2026,
      weekNumber: 24,
      profile,
      meals: [{ log_date: '2026-06-08', name: '面条', kcal: 800 }],
    })
    const active = buildWeeklyReportSnapshot({
      userId: 'user-1',
      weekStartDate: '2026-06-15',
      weekEndDate: '2026-06-21',
      year: 2026,
      weekNumber: 25,
      profile,
      exercises: [
        { log_date: '2026-06-15', name: '游泳', kcal: 300 },
        { log_date: '2026-06-17', name: '游泳', kcal: 320 },
        { log_date: '2026-06-19', name: '骑车', kcal: 240 },
      ],
      meals: Array.from({ length: 6 }, (_, index) => ({
        log_date: `2026-06-${String(15 + index).padStart(2, '0')}`,
        name: '家常饭',
        kcal: 1600,
      })),
    })
    expect(active.foxComment).not.toBe(quiet.foxComment)
    expect(active.nextWeekSuggestions).not.toEqual(quiet.nextWeekSuggestions)
  })

  it('keeps empty macro totals null instead of pretending zero grams were recorded', () => {
    const report = buildWeeklyReportSnapshot({
      userId: 'user-1',
      weekStartDate: '2026-06-08',
      weekEndDate: '2026-06-14',
      year: 2026,
      weekNumber: 24,
      profile,
      meals: [{ log_date: '2026-06-08', name: '米饭', kcal: 500 }],
    })
    expect(report.dietStats.macroLoggedDays).toBe(0)
    expect(report.dietStats.totalProtein).toBeNull()
    expect(report.dietStats.dailyDiet[0].protein).toBeNull()
  })

  it('builds a headline from a concrete weekly fact and exposes rule persona', () => {
    const report = buildWeeklyReportSnapshot({
      userId: 'user-1',
      weekStartDate: '2026-06-08',
      weekEndDate: '2026-06-14',
      year: 2026,
      weekNumber: 24,
      profile,
      exercises: [
        { log_date: '2026-06-08', name: '跑步', kcal: 200 },
        { log_date: '2026-06-10', name: '跑步', kcal: 220 },
      ],
    })
    const insights = buildWeeklyInsights(report, null)
    expect(insights.headline).toMatch(/运动 2 天|跑步/)
    expect(insights.evidence.some((item) => item.text.includes('2'))).toBe(true)
    expect(typeof insights.persona).toBe('string')
  })

  it('rejects AI narrative that invents a number outside evidence and rule metrics', () => {
    const report = buildWeeklyReportSnapshot({
      userId: 'user-1',
      weekStartDate: '2026-06-08',
      weekEndDate: '2026-06-14',
      year: 2026,
      weekNumber: 24,
      profile,
      exercises: [
        { log_date: '2026-06-08', name: '跑步', kcal: 200 },
        { log_date: '2026-06-10', name: '跑步', kcal: 220 },
      ],
    })
    const raw = {
      foxComment: `${report.foxComment}下周再完成 9999 次就好。`,
      foxEvidenceIds: ['exercise-frequency'],
      suggestions: report.nextWeekSuggestions.map(({ title, why, content }) => ({
        title,
        why,
        content,
      })),
    }
    expect(() => validateWeeklyNarrative(raw, report)).toThrow(/编造数字 9999/)
  })

  it('regenerates only the owner snapshot while preserving viewed and share columns', async () => {
    const baseReport = buildWeeklyReportSnapshot({
      userId: 'user-1',
      weekStartDate: '2026-06-08',
      weekEndDate: '2026-06-14',
      year: 2026,
      weekNumber: 24,
      profile,
      meals: [{ log_date: '2026-06-08', name: '旧饭', kcal: 700 }],
    })
    const row = {
      id: 'report-1',
      user_id: 'user-1',
      week_start_date: '2026-06-08',
      week_end_date: '2026-06-14',
      week_number: 24,
      year: 2026,
      report_json: baseReport,
      is_viewed: true,
      viewed_at: '2026-06-16T00:00:00.000Z',
      shared_to_community_at: '2026-06-17T00:00:00.000Z',
      generated_at: '2026-06-15T00:00:00.000Z',
    }
    const queryFn = vi.fn(async (sql, params) => {
      if (sql.includes('where id = $1 and user_id = $2') && sql.includes('select')) {
        return { rows: [row] }
      }
      if (sql.includes('from profiles')) return { rows: [profile] }
      if (sql.includes('from day_logs')) return { rows: [{ log_date: '2026-06-08' }] }
      if (sql.includes('from exercises')) return { rows: [] }
      if (sql.includes('from meals')) {
        return { rows: [{ log_date: '2026-06-08', name: '新饭', kcal: 650 }] }
      }
      if (sql.includes('week_start_date = $2')) return { rows: [] }
      if (sql.includes('update user_weekly_reports')) {
        return {
          rows: [{ ...row, report_json: JSON.parse(params[2]) }],
        }
      }
      return { rows: [] }
    })

    const report = await regenerateUserWeeklyReport(
      'user-1',
      'report-1',
      queryFn,
      { skipAi: true },
    )
    expect(report.id).toBe('report-1')
    expect(report.isViewed).toBe(true)
    expect(report.sharedToCommunityAt).toBe('2026-06-17T00:00:00.000Z')
    expect(report.dietStats.favoriteFood).toBe('新饭')
    const updateSql = queryFn.mock.calls.find(([sql]) => sql.includes('update user_weekly_reports'))[0]
    expect(updateSql).not.toContain('is_viewed')
    expect(updateSql).not.toContain('shared_to_community_at')
  })

  it('loads only the latest shared report for a community profile', async () => {
    loadProfileMock.mockResolvedValue({ id: 'owner-1' })
    const queryFn = vi.fn().mockResolvedValue({ rows: [] })

    await listCommunitySharedWeeklyReports('owner-1', 'viewer-1', queryFn)

    const sql = queryFn.mock.calls[0][0].replace(/\s+/g, ' ').trim()
    expect(sql).toContain(
      'order by week_start_date desc, shared_to_community_at desc limit 1',
    )
  })
})

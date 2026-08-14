import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { formatWeeklyDateLabel, normalizeUserWeeklyReport } from '../userWeeklyReport'
import type { UserWeeklyReport } from '../../types'

function cssRuleBody(css: string, selector: string) {
  const ruleStart = css.indexOf(`${selector} {`)
  if (ruleStart < 0) return ''
  const bodyStart = css.indexOf('{', ruleStart) + 1
  return css.slice(bodyStart, css.indexOf('}', bodyStart))
}

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
      nextWeekSuggestions: [
        { type: 'exercise', title: '旧建议', content: '完成一次活动。' },
      ],
    } as unknown as UserWeeklyReport

    const report = normalizeUserWeeklyReport(raw)
    expect(report).not.toBeNull()
    expect(report?.calorieStats.dailyCalories).toEqual([])
    expect(report?.exerciseStats.exerciseTypeDistribution).toEqual([])
    expect(report?.achievementStats.dailyAchievements).toEqual([])
    expect(report?.headline).toBe('小满周报')
    expect(report?.narrativeSource).toBe('rules')
    expect(report?.wowDelta.activeDays).toBeNull()
    expect(report?.dietStats.macroStatus).toBe('insufficient')
    expect(report?.dietStats.macroLoggedDays).toBe(0)
    expect(report?.insights.evidence).toEqual([])
    expect(report?.nextWeekSuggestions[0]).toMatchObject({
      type: 'exercise',
      title: '旧建议',
      why: '',
      content: '完成一次活动。',
      successMetric: '',
      evidenceIds: [],
    })
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

describe('weekly report mobile layout', () => {
  it('keeps the report grid and seven-day sections shrinkable', () => {
    const css = readFileSync(new URL('../../index.css', import.meta.url), 'utf8')
    const pageRule = cssRuleBody(css, '.weekly-report-page')
    const captureRule = cssRuleBody(css, '.weekly-report-capture')
    const chartRule = cssRuleBody(css, '.weekly-chart')
    const achievementRule = cssRuleBody(css, '.weekly-achievement-wall')

    expect(pageRule).toContain('width: 100%')
    expect(pageRule).toContain('min-width: 0')
    expect(captureRule).toContain('grid-template-columns: minmax(0, 1fr)')
    expect(captureRule).toContain('min-width: 0')
    expect(captureRule).toContain('max-width: 100%')
    expect(chartRule).toContain('repeat(7, minmax(0, 1fr))')
    expect(achievementRule).toContain('repeat(7, minmax(0, 1fr))')
    expect(css).not.toContain('repeat(7, minmax(2.2rem, 1fr))')
    expect(css).not.toContain('repeat(7, minmax(4.2rem, 1fr))')
  })
})

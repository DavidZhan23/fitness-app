import { describe, expect, it } from 'vitest'
import { computeStreak, getLastNDays, getWeeksGrid } from '../streaks'

describe('streaks', () => {
  it('computeStreak counts consecutive exercise days from most recent hit', () => {
    const days = [
      { date: '2026-05-22', exerciseCheck: true, deficitCheck: false, deficit: 0, exerciseKcal: 100 },
      { date: '2026-05-23', exerciseCheck: true, deficitCheck: false, deficit: 0, exerciseKcal: 100 },
      { date: '2026-05-24', exerciseCheck: false, deficitCheck: false, deficit: 0, exerciseKcal: 0 },
    ]
    expect(computeStreak(days, 'exercise')).toBe(2)
  })

  it('getLastNDays returns ascending keys ending at anchor date', () => {
    const end = new Date('2026-05-24T12:00:00')
    expect(getLastNDays(3, end)).toEqual(['2026-05-22', '2026-05-23', '2026-05-24'])
  })

  it('getWeeksGrid pads leading blanks to week boundary', () => {
    const { weeks } = getWeeksGrid(['2026-05-24'])
    expect(weeks[0].filter(Boolean)).toEqual(['2026-05-24'])
  })
})

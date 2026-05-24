import { describe, expect, it } from 'vitest'
import { calculateSpreadDeficit, getMinutesElapsedForDate } from '../metabolism'

const spreadDeficitCases = [
  {
    dailyBmr: 2000,
    exerciseKcal: 300,
    mealKcal: 800,
    dateKey: '2026-05-24',
    now: new Date('2026-05-24T12:00:00'),
    expected: 500,
  },
]

describe('metabolism', () => {
  it('getMinutesElapsedForDate for today noon', () => {
    const now = new Date('2026-05-24T12:00:00')
    expect(getMinutesElapsedForDate('2026-05-24', now)).toBe(720)
  })

  it('getMinutesElapsedForDate for future day is zero', () => {
    const now = new Date('2026-05-24T12:00:00')
    expect(getMinutesElapsedForDate('2026-05-25', now)).toBe(0)
  })

  it('calculateSpreadDeficit matches server parity vectors', () => {
    for (const c of spreadDeficitCases) {
      expect(
        calculateSpreadDeficit(
          c.dailyBmr,
          c.exerciseKcal,
          c.mealKcal,
          c.dateKey,
          c.now,
        ),
      ).toBe(c.expected)
    }
  })
})

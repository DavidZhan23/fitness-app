import { describe, expect, it } from 'vitest'
import {
  calculateDeficitByMode,
  calculateSpreadDeficit,
  getMetabolismByMode,
  getMinutesElapsedForDate,
} from '../metabolism'

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

  it('full_day immediately counts the full daily metabolism', () => {
    const now = new Date('2026-05-24T08:00:00')
    expect(getMetabolismByMode(1800, '2026-05-24', 'full_day', now)).toBe(1800)
    expect(
      calculateDeficitByMode(1800, 100, 500, '2026-05-24', 'full_day', now),
    ).toBe(1400)
  })

  it('time_spread counts metabolism by elapsed minutes', () => {
    const now = new Date('2026-05-24T12:00:00')
    expect(getMetabolismByMode(1800, '2026-05-24', 'time_spread', now)).toBe(900)
  })

  it('historical days always count the full daily metabolism', () => {
    const now = new Date('2026-05-25T12:00:00')
    expect(getMetabolismByMode(1800, '2026-05-24', 'time_spread', now)).toBe(1800)
  })
})

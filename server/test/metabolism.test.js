import { describe, expect, it } from 'vitest'
import {
  calculateDeficitByMode,
  calculateSpreadDeficit,
  getMetabolismByMode,
  getMinutesElapsedForDate,
} from '../src/metabolism.js'
import { spreadDeficitCases } from './formulaCases.js'

describe('server metabolism parity', () => {
  it('calculateSpreadDeficit matches shared vectors', () => {
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

  it('supports full-day and time-spread modes', () => {
    const now = new Date('2026-05-24T04:00:00Z')
    expect(getMetabolismByMode(2000, '2026-05-24', 'full_day', now)).toBe(2000)
    expect(getMetabolismByMode(2000, '2026-05-24', 'time_spread', now)).toBe(1000)
    expect(
      calculateDeficitByMode(2000, 300, 800, '2026-05-24', 'full_day', now),
    ).toBe(1500)
  })

  it('uses DISPLAY_TIMEZONE instead of the container timezone for current-day metabolism', () => {
    const shanghaiEvening = new Date('2026-05-24T12:00:00Z')
    expect(getMinutesElapsedForDate('2026-05-24', shanghaiEvening)).toBe(1200)
    expect(
      getMetabolismByMode(1800, '2026-05-24', 'time_spread', shanghaiEvening),
    ).toBe(1500)

    const shanghaiEarlyMorning = new Date('2026-05-23T20:00:00Z')
    expect(
      getMetabolismByMode(1800, '2026-05-24', 'full_day', shanghaiEarlyMorning),
    ).toBe(1800)
  })
})

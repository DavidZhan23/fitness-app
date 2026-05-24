import { describe, expect, it } from 'vitest'
import { calculateSpreadDeficit } from '../src/metabolism.js'
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
})

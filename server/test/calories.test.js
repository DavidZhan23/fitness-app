import { describe, expect, it } from 'vitest'
import {
  calculateBmr,
  calculateTdee,
  resolveProfileBmr,
} from '../src/calories.js'
import { bmrCases, tdeeCases } from './formulaCases.js'

describe('server calories parity', () => {
  it('calculateBmr matches shared vectors', () => {
    for (const c of bmrCases) {
      expect(calculateBmr(c.weightKg, c.heightCm, c.age, c.sex)).toBe(c.expected)
    }
  })

  it('calculateTdee matches shared vectors', () => {
    for (const c of tdeeCases) {
      expect(calculateTdee(c.bmr, c.activityFactor)).toBe(c.expected)
    }
  })

  it.each([null, 'unknown'])(
    'resolveProfileBmr falls back to stored BMR for invalid sex %s',
    (sex) => {
      expect(
        resolveProfileBmr({
          weight_kg: 70,
          height_cm: 175,
          age: 30,
          sex,
          activity_factor: 1.375,
          bmr: 1500,
        }),
      ).toBe(1500)
    },
  )
})

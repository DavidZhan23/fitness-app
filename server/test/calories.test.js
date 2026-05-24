import { describe, expect, it } from 'vitest'
import { calculateBmr, calculateTdee } from '../src/calories.js'
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
})

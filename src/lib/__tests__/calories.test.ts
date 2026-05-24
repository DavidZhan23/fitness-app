import { describe, expect, it } from 'vitest'
import {
  calculateBmr,
  calculateTdee,
  getDeficitHeatmapCell,
  resolveProfileMetabolism,
} from '../calories'

const bmrCases = [
  { weightKg: 70, heightCm: 175, age: 30, sex: 'male' as const, expected: 1649 },
  { weightKg: 55, heightCm: 162, age: 28, sex: 'female' as const, expected: 1262 },
]

const tdeeCases = [
  { bmr: 1649, activityFactor: 1.375, expected: 2267 },
  { bmr: 1296, activityFactor: 1.2, expected: 1555 },
]

describe('calories', () => {
  it('calculateBmr matches server parity vectors', () => {
    for (const c of bmrCases) {
      expect(calculateBmr(c.weightKg, c.heightCm, c.age, c.sex)).toBe(c.expected)
    }
  })

  it('calculateTdee matches server parity vectors', () => {
    for (const c of tdeeCases) {
      expect(calculateTdee(c.bmr, c.activityFactor)).toBe(c.expected)
    }
  })

  it('resolveProfileMetabolism uses body metrics when complete', () => {
    const { bmr, tdee } = resolveProfileMetabolism({
      id: 'u1',
      email: 'a@b.c',
      onboarding_complete: true,
      weight_kg: 70,
      height_cm: 175,
      age: 30,
      sex: 'male',
      activity_factor: 1.375,
      bmr: 0,
      tdee: 0,
      deficit_threshold: 300,
    })
    expect(bmr).toBe(1649)
    expect(tdee).toBe(2267)
  })

  it('getDeficitHeatmapCell classifies deficit / surplus / neutral', () => {
    expect(getDeficitHeatmapCell(400, 300).tone).toBe('deficit')
    expect(getDeficitHeatmapCell(-400, 300).tone).toBe('surplus')
    expect(getDeficitHeatmapCell(50, 300).tone).toBe('neutral')
  })
})

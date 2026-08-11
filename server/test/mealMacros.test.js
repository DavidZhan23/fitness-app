import { describe, expect, it } from 'vitest'
import {
  calibrateMealMacros,
  fillMissingMealMacros,
  macrosFromEstimateItems,
  parseMealMacroInput,
  resolveMealMacrosSource,
} from '../src/mealMacros.js'

describe('meal macro normalization', () => {
  it('scales complete P/F/C to saved kcal and scales sugar with carbs', () => {
    const result = calibrateMealMacros(
      { protein_g: 20, fat_g: 10, carbs_g: 30, sugar_g: 8 },
      580,
    )
    expect(result.macros).toEqual({
      protein_g: 40,
      fat_g: 20,
      carbs_g: 60,
      sugar_g: 16,
    })
    expect(result.sugarClamped).toBe(false)
  })

  it('clamps sugar to carbs and leaves incomplete macros unscaled', () => {
    const result = calibrateMealMacros(
      { protein_g: 25, fat_g: null, carbs_g: 10, sugar_g: 18 },
      500,
    )
    expect(result.macros).toEqual({
      protein_g: 25,
      fat_g: null,
      carbs_g: 10,
      sugar_g: 10,
    })
    expect(result.sugarClamped).toBe(true)
  })

  it('fills only empty fields and aggregates AI per-unit grams by quantity', () => {
    const estimated = macrosFromEstimateItems([
      {
        quantity: 2,
        protein_g: 6,
        fat_g: 4,
        carbs_g: 12,
        sugar_g: 3,
      },
    ])
    expect(estimated).toEqual({
      protein_g: 12,
      fat_g: 8,
      carbs_g: 24,
      sugar_g: 6,
    })
    expect(
      fillMissingMealMacros(
        { protein_g: 30, fat_g: null, carbs_g: null, sugar_g: null },
        estimated,
      ),
    ).toEqual({ protein_g: 30, fat_g: 8, carbs_g: 24, sugar_g: 6 })
  })

  it('accepts nullable fields and rejects negative grams', () => {
    expect(parseMealMacroInput({ protein_g: '12.34', fat_g: '' })).toMatchObject({
      macros: { protein_g: 12.3, fat_g: null },
      hasProvidedField: true,
    })
    expect(parseMealMacroInput({ carbs_g: -1 })).toEqual({
      error: '营养素克数须为 0–10000 的数字',
    })
  })

  it('marks a failed all-empty AI attempt so it is not retried on page open', () => {
    const empty = {
      protein_g: null,
      fat_g: null,
      carbs_g: null,
      sugar_g: null,
    }
    expect(
      resolveMealMacrosSource(empty, { attemptedEstimate: true }),
    ).toBe('ai')
    expect(resolveMealMacrosSource(empty)).toBeNull()
  })
})

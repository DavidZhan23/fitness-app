import { describe, expect, it } from 'vitest'
import {
  calculateMacroTargets,
  compareMacroToTarget,
  needsMealMacroBackfill,
  parseMacroDraft,
  summarizeMealMacros,
  isMealMacroEstimating,
  isNutritionEstimateInProgress,
} from '../macroTargets'
import type { Meal, Profile } from '../../types'

const profile: Profile = {
  id: 'u1',
  email: 'test@example.com',
  weight_kg: 70,
  height_cm: 175,
  age: 30,
  sex: 'male',
  activity_factor: 1.55,
  bmr: null,
  tdee: null,
  deficit_threshold: 300,
  onboarding_complete: true,
}

function meal(id: string, macros: Partial<Meal>): Meal {
  return {
    id,
    day_log_id: 'd1',
    user_id: 'u1',
    name: `meal-${id}`,
    kcal: 300,
    created_at: '2026-08-11T10:00:00Z',
    batch_id: null,
    protein_g: null,
    fat_g: null,
    carbs_g: null,
    sugar_g: null,
    sugar_scope: 'added',
    macros_source: null,
    ...macros,
  }
}

describe('macro targets', () => {
  it('uses body profile, activity and deficit goal for rule targets', () => {
    expect(calculateMacroTargets(profile)).toEqual({
      protein_g: 126,
      fat_g: 63,
      carbs_g: 296,
      sugar_g: 25,
    })
  })

  it('offers high, normal and low oil/sugar tiers', () => {
    expect(calculateMacroTargets(profile, 'high-oil-sugar')).toEqual({
      protein_g: 126,
      fat_g: 77,
      carbs_g: 265,
      sugar_g: 50,
    })
    expect(calculateMacroTargets(profile, 'low-oil-sugar')).toEqual({
      protein_g: 126,
      fat_g: 30,
      carbs_g: 371,
      sugar_g: 15,
    })
  })

  it('classifies within 10% as near', () => {
    expect(compareMacroToTarget(90, 100)).toBe('near')
    expect(compareMacroToTarget(89, 100)).toBe('low')
    expect(compareMacroToTarget(111, 100)).toBe('high')
  })

  it('sums each meal row without grouping by batch', () => {
    const meals = [
      meal('1', { protein_g: 10, fat_g: 5, carbs_g: 20, sugar_g: 4 }),
      meal('2', { protein_g: 8, fat_g: null, carbs_g: 12, sugar_g: 3 }),
    ]
    expect(summarizeMealMacros(meals)).toEqual({
      protein_g: 18,
      fat_g: 5,
      carbs_g: 32,
      sugar_g: 7,
    })
  })

  it('does not expose a legacy total-sugar value as added sugar while backfilling', () => {
    expect(
      summarizeMealMacros([
        meal('legacy', { sugar_g: 25, sugar_scope: null }),
        meal('added', { sugar_g: 8, sugar_scope: 'added' }),
      ]).sugar_g,
    ).toBe(8)
  })

  it('keeps added sugar independent and marks hand-entered macros as user', () => {
    expect(
      parseMacroDraft({
        protein_g: '20',
        fat_g: '',
        carbs_g: '12',
        sugar_g: '18',
      }),
    ).toEqual({
      ok: true,
      macros: {
        protein_g: 20,
        fat_g: null,
        carbs_g: 12,
        sugar_g: 18,
        macros_source: 'user',
      },
      sugarClamped: false,
    })
  })

  it('backfills every meal that has not adopted the added-sugar scope', () => {
    expect(needsMealMacroBackfill(meal('legacy', { sugar_scope: null }))).toBe(true)
    expect(needsMealMacroBackfill(meal('attempted', { macros_source: 'ai' }))).toBe(false)
    expect(needsMealMacroBackfill(meal('partial', { protein_g: 20 }))).toBe(false)
  })

  it('treats pending macros or pending micronutrients as in-progress', () => {
    expect(isMealMacroEstimating(meal('p', { macros_status: 'pending' }))).toBe(true)
    expect(
      isNutritionEstimateInProgress(
        { micronutrient_status: 'ready' },
        [meal('p', { macros_status: 'pending' })],
      ),
    ).toBe(true)
    expect(
      isNutritionEstimateInProgress(
        { micronutrient_status: 'pending' },
        [meal('ready', { macros_status: 'ready' })],
      ),
    ).toBe(true)
    expect(
      isNutritionEstimateInProgress(
        { micronutrient_status: 'ready' },
        [meal('ready', { macros_status: 'ready' })],
      ),
    ).toBe(false)
  })
})

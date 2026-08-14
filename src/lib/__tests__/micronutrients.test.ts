import { describe, expect, it } from 'vitest'
import {
  MICRONUTRIENT_CATALOG,
  filterMicronutrientItems,
  mealMicronutrientEstimateLines,
  mealMicronutrientRowStatus,
  micronutrientItemsForDisplay,
} from '../micronutrients'

describe('micronutrient display catalog', () => {
  it('always returns the fixed 16 items and orders low before unknown before adequate', () => {
    const items = micronutrientItemsForDisplay({
      version: 1,
      items: [
        { id: 'vit_a', status: 'adequate' },
        { id: 'iron', status: 'low', food_suggestions: ['瘦肉'] },
      ],
    })
    expect(items).toHaveLength(16)
    expect(items[0].id).toBe('iron')
    expect(items[0].status).toBe('low')
    expect(items.at(-1)).toMatchObject({ id: 'vit_a', status: 'adequate' })
    expect(new Set(items.map((item) => item.id))).toEqual(
      new Set(MICRONUTRIENT_CATALOG.map((item) => item.id)),
    )
  })

  it('provides family-readable role and food education for all 16 ids', () => {
    expect(MICRONUTRIENT_CATALOG).toHaveLength(16)
    expect(new Set(MICRONUTRIENT_CATALOG.map((item) => item.id)).size).toBe(16)
    for (const item of MICRONUTRIENT_CATALOG) {
      expect(item.shortLabel.trim()).not.toBe('')
      expect(item.role.split('。').filter(Boolean)).toHaveLength(2)
      expect(item.foods.split('。').filter(Boolean)).toHaveLength(2)
      expect(`${item.role}${item.foods}`).not.toMatch(/保健品|补充剂|品牌|\d+\s*(?:mg|μg|ug)/i)
    }
  })

  it('filters the compact grid by status and catalog group', () => {
    const items = micronutrientItemsForDisplay({
      version: 1,
      items: [
        { id: 'vit_c', status: 'low' },
        { id: 'iron', status: 'adequate' },
      ],
    })

    expect(filterMicronutrientItems(items, 'low').map((item) => item.id)).toEqual([
      'vit_c',
    ])
    expect(filterMicronutrientItems(items, 'vitamins')).toHaveLength(10)
    expect(filterMicronutrientItems(items, 'minerals')).toHaveLength(6)
  })

  it('keeps estimated progress fields from a v2 summary', () => {
    const items = micronutrientItemsForDisplay({
      version: 2,
      items: [
        {
          id: 'iron',
          status: 'low',
          estimated_amount: 3,
          unit: 'mg',
          dri_amount: 20,
          estimated_pct: 15,
        },
      ],
    })
    expect(items[0]).toMatchObject({
      id: 'iron',
      estimated_pct: 15,
      dri_amount: 20,
    })
  })

  it('labels meal food rows as ready, pending, or failed', () => {
    const readyMeal = {
      micronutrients: {
        version: 1 as const,
        components: [{ name: '米饭', grams: 150 }],
        items: [{ id: 'iron' as const, amount: 1, unit: 'mg' as const, confidence: 'medium' as const }],
      },
      macros_status: 'ready' as const,
    }
    expect(mealMicronutrientRowStatus(readyMeal, 'ready')).toBe('ready')
    expect(
      mealMicronutrientRowStatus({ micronutrients: null, macros_status: 'pending' }, 'ready'),
    ).toBe('pending')
    expect(
      mealMicronutrientRowStatus({ micronutrients: null }, 'pending'),
    ).toBe('pending')
    expect(
      mealMicronutrientRowStatus({ micronutrients: null, macros_status: 'error' }, 'error'),
    ).toBe('error')
  })

  it('lists positive meal micronutrient estimates and skips zeros', () => {
    const lines = mealMicronutrientEstimateLines({
      micronutrients: {
        version: 1,
        components: [{ name: '米饭', grams: 150 }],
        items: [
          { id: 'iron', amount: 2.4, unit: 'mg', confidence: 'medium' },
          { id: 'vit_c', amount: 12, unit: 'mg', confidence: 'high' },
          { id: 'calcium', amount: 0, unit: 'mg', confidence: 'unknown' },
        ],
      },
    })
    expect(lines.map((line) => line.id)).toEqual(['vit_c', 'iron'])
    expect(lines[0]).toMatchObject({ label: '维 C', amountText: '12 mg' })
    expect(lines[1]).toMatchObject({ label: '铁', amountText: '2.4 mg' })
  })
})

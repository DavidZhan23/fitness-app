import { describe, expect, it } from 'vitest'
import {
  MICRONUTRIENT_CATALOG,
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
})

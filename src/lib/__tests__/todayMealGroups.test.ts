import { describe, expect, it } from 'vitest'
import {
  countMealDisplayEntries,
  groupMealsForDisplay,
} from '../todayMealGroups'
import type { Meal } from '../../types'

function meal(
  partial: Partial<Meal> & Pick<Meal, 'id' | 'name' | 'created_at'>,
): Meal {
  return {
    day_log_id: 'day-1',
    user_id: 'user-1',
    kcal: partial.kcal ?? 100,
    batch_id: partial.batch_id ?? null,
    ...partial,
  }
}

describe('groupMealsForDisplay', () => {
  it('merges meals with the same batch_id', () => {
    const groups = groupMealsForDisplay([
      meal({
        id: 'm1',
        name: '鸡胸肉 100g',
        kcal: 165,
        batch_id: 'batch-a',
        created_at: '2025-05-31T10:00:00Z',
      }),
      meal({
        id: 'm2',
        name: '鸡蛋 1个',
        kcal: 78,
        batch_id: 'batch-a',
        created_at: '2025-05-31T10:00:01Z',
      }),
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0].isMultiItem).toBe(true)
    expect(groups[0].meals.map((m) => m.id)).toEqual(['m1', 'm2'])
    expect(groups[0].totalKcal).toBe(243)
  })

  it('sorts groups by latest created_at desc and items asc within group', () => {
    const groups = groupMealsForDisplay([
      meal({
        id: 'old-single',
        name: '米饭',
        created_at: '2025-05-30T12:00:00Z',
      }),
      meal({
        id: 'b2',
        name: 'B2',
        batch_id: 'batch-new',
        created_at: '2025-05-31T11:00:01Z',
      }),
      meal({
        id: 'b1',
        name: 'B1',
        batch_id: 'batch-new',
        created_at: '2025-05-31T11:00:00Z',
      }),
      meal({
        id: 'mid-single',
        name: '沙拉',
        created_at: '2025-05-31T09:00:00Z',
      }),
    ])

    expect(groups.map((g) => g.key)).toEqual([
      'batch:batch-new',
      'meal:mid-single',
      'meal:old-single',
    ])
    expect(groups[0].meals.map((m) => m.id)).toEqual(['b1', 'b2'])
  })

  it('treats a lone batch member as a single row', () => {
    const groups = groupMealsForDisplay([
      meal({
        id: 'only',
        name: '牛奶',
        batch_id: 'batch-solo',
        created_at: '2025-05-31T10:00:00Z',
      }),
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0].isMultiItem).toBe(false)
  })
})

describe('countMealDisplayEntries', () => {
  it('counts batch groups as one entry', () => {
    const count = countMealDisplayEntries([
      meal({ id: 'a', name: 'A', batch_id: 'batch-1', created_at: '2025-05-31T10:00:00Z' }),
      meal({ id: 'b', name: 'B', batch_id: 'batch-1', created_at: '2025-05-31T10:00:01Z' }),
      meal({ id: 'c', name: 'C', created_at: '2025-05-31T09:00:00Z' }),
    ])
    expect(count).toBe(2)
  })
})

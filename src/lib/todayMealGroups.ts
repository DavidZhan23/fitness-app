import { toKcal } from './calories'
import type { Meal } from '../types'

export type MealDisplayGroup = {
  key: string
  batchId: string | null
  meals: Meal[]
  totalKcal: number
  isMultiItem: boolean
}

function parseCreatedAt(iso: string): number {
  const ms = Date.parse(iso)
  return Number.isFinite(ms) ? ms : 0
}

function sumMealKcal(meals: Meal[]): number {
  return meals.reduce((sum, meal) => sum + toKcal(meal.kcal), 0)
}

function sortMealsInGroup(meals: Meal[]): Meal[] {
  return [...meals].sort(
    (a, b) => parseCreatedAt(a.created_at) - parseCreatedAt(b.created_at),
  )
}

export function groupMealsForDisplay(meals: Meal[]): MealDisplayGroup[] {
  const batchMap = new Map<string, Meal[]>()
  const singles: Meal[] = []

  for (const meal of meals) {
    const batchId = meal.batch_id?.trim()
    if (batchId) {
      const bucket = batchMap.get(batchId)
      if (bucket) bucket.push(meal)
      else batchMap.set(batchId, [meal])
    } else {
      singles.push(meal)
    }
  }

  const groups: MealDisplayGroup[] = []

  for (const [batchId, batchMeals] of batchMap) {
    const sorted = sortMealsInGroup(batchMeals)
    groups.push({
      key: `batch:${batchId}`,
      batchId,
      meals: sorted,
      totalKcal: sumMealKcal(sorted),
      isMultiItem: sorted.length > 1,
    })
  }

  for (const meal of singles) {
    groups.push({
      key: `meal:${meal.id}`,
      batchId: null,
      meals: [meal],
      totalKcal: sumMealKcal([meal]),
      isMultiItem: false,
    })
  }

  return groups.sort((a, b) => {
    const aLatest = Math.max(...a.meals.map((m) => parseCreatedAt(m.created_at)))
    const bLatest = Math.max(...b.meals.map((m) => parseCreatedAt(m.created_at)))
    return bLatest - aLatest
  })
}

export function countMealDisplayEntries(meals: Meal[]): number {
  return groupMealsForDisplay(meals).length
}

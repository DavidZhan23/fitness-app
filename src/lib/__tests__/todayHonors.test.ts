import { describe, expect, it } from 'vitest'
import {
  buildTodayHonors,
  classifyHonorCategory,
} from '../todayHonors'

const bmr = 1687

describe('classifyHonorCategory', () => {
  it('maps champion to exercise', () => {
    expect(classifyHonorCategory('champion')).toBe('exercise')
  })

  it('maps foodKing to meal', () => {
    expect(classifyHonorCategory('foodKing')).toBe('meal')
  })

  it('maps elite to exercise', () => {
    expect(classifyHonorCategory('elite')).toBe('exercise')
  })
})

describe('buildTodayHonors', () => {
  it('returns honors in stable listPublicHonorBadges order', () => {
    const honors = buildTodayHonors({
      deficit: 900,
      exerciseKcal: 700,
      mealKcal: 2100,
      dailyBmr: bmr,
    })

    expect(honors.map((h) => h.key)).toEqual(['champion', 'foodKing'])
    expect(honors[0]?.category).toBe('exercise')
    expect(honors[1]?.category).toBe('meal')
    expect(honors[0]?.title).toBe('运动大王')
    expect(honors[1]?.title).toBe('美食大王')
  })

  it('returns elite in exercise category', () => {
    const honors = buildTodayHonors({
      deficit: 600,
      exerciseKcal: 200,
      mealKcal: 500,
      dailyBmr: bmr,
    })

    expect(honors).toEqual([
      expect.objectContaining({
        key: 'elite',
        category: 'exercise',
        title: '减脂先锋',
      }),
    ])
  })

  it('returns empty array when no honors earned', () => {
    expect(
      buildTodayHonors({
        deficit: 100,
        exerciseKcal: 0,
        mealKcal: 0,
        dailyBmr: bmr,
      }),
    ).toEqual([])
  })
})

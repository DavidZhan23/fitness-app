import { describe, expect, it } from 'vitest'
import {
  listDayBadges,
  listPublicHonorBadges,
  resolveDeficitGridBadge,
  resolveExerciseGridBadge,
  resolveHeatmapDayBadge,
} from '../communityBadges'

const bmr = 1687

describe('communityBadges grid helpers', () => {
  it('listDayBadges returns champion and foodKing together', () => {
    expect(
      listDayBadges({
        deficit: 900,
        exerciseKcal: 700,
        mealKcal: 2100,
        dailyBmr: bmr,
      }),
    ).toEqual(['champion', 'foodKing'])
  })

  it('listDayBadges returns only meal when deficit high and no meal logged', () => {
    expect(
      listDayBadges({
        deficit: 600,
        exerciseKcal: 100,
        mealKcal: 0,
        dailyBmr: bmr,
      }),
    ).toEqual(['meal'])
  })

  it('elite excludes meal reminder when needsMealLog would apply', () => {
    const badges = listDayBadges({
      deficit: 600,
      exerciseKcal: 200,
      mealKcal: 100,
      dailyBmr: bmr,
    })
    expect(badges).toEqual(['elite'])
    expect(badges).not.toContain('meal')
  })

  it('resolveExerciseGridBadge is champion or elite only', () => {
    expect(
      resolveExerciseGridBadge({
        deficit: 900,
        exerciseKcal: 700,
        mealKcal: 2100,
        dailyBmr: bmr,
      }),
    ).toBe('champion')
    expect(
      resolveExerciseGridBadge({
        deficit: 600,
        exerciseKcal: 200,
        mealKcal: 500,
        dailyBmr: bmr,
      }),
    ).toBe('elite')
    expect(
      resolveExerciseGridBadge({
        deficit: 600,
        exerciseKcal: 0,
        mealKcal: 0,
        dailyBmr: bmr,
      }),
    ).toBeNull()
  })

  it('resolveDeficitGridBadge prefers foodKing over meal', () => {
    expect(
      resolveDeficitGridBadge({
        deficit: 600,
        exerciseKcal: 0,
        mealKcal: 0,
        dailyBmr: bmr,
      }),
    ).toBe('meal')
    expect(
      resolveDeficitGridBadge({
        deficit: 900,
        exerciseKcal: 700,
        mealKcal: 2100,
        dailyBmr: bmr,
      }),
    ).toBe('foodKing')
  })

  it('resolveHeatmapDayBadge keeps global primary order', () => {
    expect(
      resolveHeatmapDayBadge({
        deficit: 900,
        exerciseKcal: 700,
        mealKcal: 2100,
        dailyBmr: bmr,
      }),
    ).toBe('champion')
  })
})

describe('listPublicHonorBadges', () => {
  it('excludes meal reminder when deficit high and no meal logged', () => {
    expect(
      listPublicHonorBadges({
        deficit: 600,
        exerciseKcal: 100,
        mealKcal: 0,
        dailyBmr: bmr,
      }),
    ).toEqual([])
    expect(
      listDayBadges({
        deficit: 600,
        exerciseKcal: 100,
        mealKcal: 0,
        dailyBmr: bmr,
      }),
    ).toEqual(['meal'])
  })

  it('returns champion and foodKing together', () => {
    expect(
      listPublicHonorBadges({
        deficit: 900,
        exerciseKcal: 700,
        mealKcal: 2100,
        dailyBmr: bmr,
      }),
    ).toEqual(['champion', 'foodKing'])
  })

  it('returns elite without meal when meal is logged', () => {
    const badges = listPublicHonorBadges({
      deficit: 600,
      exerciseKcal: 200,
      mealKcal: 100,
      dailyBmr: bmr,
    })
    expect(badges).toEqual(['elite'])
    expect(badges).not.toContain('meal')
  })
})

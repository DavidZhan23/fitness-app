import { describe, expect, it } from 'vitest'
import {
  calculateBmr,
  calculateTdee,
  getCalendarDayDetailBackgroundClass,
  getCalendarDayDetailHeatmapClass,
  getDeficitHeatmapClass,
  getDeficitHeatmapCell,
  getLiveWallLegendHighlight,
  getWallLegendHighlight,
  legendSwatchLevel,
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

  it('getDeficitHeatmapCell classifies by fixed deficit bands', () => {
    expect(getDeficitHeatmapCell(0, 300)).toEqual({ level: 0, tone: 'neutral' })
    expect(getDeficitHeatmapCell(149, 300)).toEqual({ level: 1, tone: 'deficit' })
    expect(getDeficitHeatmapCell(150, 300)).toEqual({ level: 2, tone: 'deficit' })
    expect(getDeficitHeatmapCell(300, 300)).toEqual({ level: 3, tone: 'deficit' })
    expect(getDeficitHeatmapCell(450, 300)).toEqual({ level: 4, tone: 'deficit' })
    expect(getDeficitHeatmapCell(-149, 300)).toEqual({
      level: 1,
      tone: 'surplus',
    })
    expect(getDeficitHeatmapCell(-600, 300)).toEqual({
      level: 4,
      tone: 'surplus',
    })
  })

  it('legendSwatchLevel maps 0 to level 1 swatch', () => {
    expect(legendSwatchLevel(0)).toBe(1)
    expect(legendSwatchLevel(3)).toBe(3)
  })

  it('getWallLegendHighlight reflects cell and beforeAccount', () => {
    expect(
      getWallLegendHighlight(
        { exerciseLevel: 2, deficitLevel: 3, deficitTone: 'deficit' },
        false,
      ),
    ).toEqual({ exerciseLevel: 2, deficitLevel: 3, deficitTone: 'deficit' })
    expect(
      getWallLegendHighlight(
        { exerciseLevel: 1, deficitLevel: 2, deficitTone: 'surplus' },
        false,
      ).deficitTone,
    ).toBe('surplus')
    expect(
      getWallLegendHighlight(undefined, false),
    ).toEqual({ exerciseLevel: 0, deficitLevel: 0, deficitTone: 'neutral' })
    expect(getWallLegendHighlight(undefined, true)).toEqual({
      exerciseLevel: 0,
      deficitLevel: 0,
      deficitTone: 'neutral',
    })
  })

  it('getLiveWallLegendHighlight uses live exercise and deficit', () => {
    const heatmap = getDeficitHeatmapCell(-744, 300)
    expect(getLiveWallLegendHighlight(300, heatmap, false)).toEqual({
      exerciseLevel: 2,
      deficitLevel: heatmap.level,
      deficitTone: 'surplus',
    })
  })

  it('getCalendarDayDetailBackgroundClass follows visible wall', () => {
    const heatmap = getDeficitHeatmapCell(-744, 300)
    expect(
      getCalendarDayDetailBackgroundClass({
        beforeAccount: false,
        splitExercisePane: true,
        exerciseKcal: 300,
        deficitHeatmap: heatmap,
      }),
    ).toBe('heatmap-exercise-2')
    expect(
      getCalendarDayDetailBackgroundClass({
        beforeAccount: false,
        splitExercisePane: false,
        exerciseKcal: 300,
        deficitHeatmap: heatmap,
      }),
    ).toBe(getDeficitHeatmapClass(heatmap.level, heatmap.tone))
  })

  it('getCalendarDayDetailHeatmapClass uses live fallback not stale cell', () => {
    expect(
      getCalendarDayDetailHeatmapClass(
        { deficitLevel: 3, deficitTone: 'deficit' },
        { level: 0, tone: 'neutral' },
      ),
    ).toBe('heatmap-empty')
    expect(
      getCalendarDayDetailHeatmapClass(
        { deficitLevel: 2, deficitTone: 'surplus', beforeAccount: true },
        { level: 4, tone: 'deficit' },
      ),
    ).toBe('heatmap-empty')
    const fallback = getDeficitHeatmapCell(-900, 300)
    expect(getCalendarDayDetailHeatmapClass(undefined, fallback)).toBe(
      'heatmap-surplus-4',
    )
  })
})

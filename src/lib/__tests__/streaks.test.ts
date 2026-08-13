import { describe, expect, it } from 'vitest'
import {
  computeStreak,
  formatDateKey,
  getLastNDays,
  getWeeksGrid,
  normalizeDateKey,
} from '../streaks'

describe('streaks', () => {
  const day = (
    date: string,
    exerciseKcal = 0,
    deficit = 0,
  ) => ({
    date,
    exerciseCheck: exerciseKcal > 0,
    deficitCheck: deficit > 300,
    deficit,
    exerciseKcal,
  })

  it('computeStreak includes today when today and yesterday hit', () => {
    expect(
      computeStreak(
        [day('2026-05-23', 100), day('2026-05-24', 100)],
        'exercise',
        '2026-05-24',
      ),
    ).toBe(2)
  })

  it('computeStreak allows today to miss and counts from yesterday', () => {
    expect(
      computeStreak(
        [
          day('2026-05-22', 100),
          day('2026-05-23', 100),
          day('2026-05-24'),
        ],
        'exercise',
        '2026-05-24',
      ),
    ).toBe(2)
  })

  it('computeStreak returns zero when both today and yesterday miss', () => {
    expect(
      computeStreak(
        [
          day('2026-05-21', 100),
          day('2026-05-22', 100),
          day('2026-05-23'),
          day('2026-05-24'),
        ],
        'exercise',
        '2026-05-24',
      ),
    ).toBe(0)
  })

  it('computeStreak returns zero when no day hits', () => {
    expect(
      computeStreak(
        [day('2026-05-22'), day('2026-05-23'), day('2026-05-24')],
        'exercise',
        '2026-05-24',
      ),
    ).toBe(0)
  })

  it('computeStreak returns zero for an empty range', () => {
    expect(computeStreak([], 'exercise', '2026-05-24')).toBe(0)
    expect(computeStreak([], 'deficit', '2026-05-24', 300)).toBe(0)
  })

  it('computeStreak applies the same today grace rule to deficit', () => {
    const days = [
      day('2026-05-21', 0, 450),
      day('2026-05-22', 0, 500),
      day('2026-05-23', 0, 400),
      day('2026-05-24', 0, 0),
    ]
    expect(computeStreak(days, 'deficit', '2026-05-24', 300)).toBe(3)

    days[2] = day('2026-05-23', 0, 0)
    expect(computeStreak(days, 'deficit', '2026-05-24', 300)).toBe(0)
  })

  it('computeStreak includes today for deficit and returns zero with no hit', () => {
    expect(
      computeStreak(
        [day('2026-05-23', 0, 400), day('2026-05-24', 0, 500)],
        'deficit',
        '2026-05-24',
        300,
      ),
    ).toBe(2)
    expect(
      computeStreak(
        [day('2026-05-23'), day('2026-05-24')],
        'deficit',
        '2026-05-24',
        300,
      ),
    ).toBe(0)
  })

  it('getLastNDays returns ascending keys ending at anchor date', () => {
    const end = new Date('2026-05-24T12:00:00')
    expect(getLastNDays(3, end)).toEqual(['2026-05-22', '2026-05-23', '2026-05-24'])
  })

  it('getWeeksGrid pads leading blanks to week boundary', () => {
    const { weeks } = getWeeksGrid(['2026-05-24'])
    expect(weeks[0].filter(Boolean)).toEqual(['2026-05-24'])
  })

  it('normalizeDateKey keeps plain YYYY-MM-DD', () => {
    expect(normalizeDateKey('2026-05-26')).toBe('2026-05-26')
  })

  it('normalizeDateKey maps ISO timestamps to local calendar day', () => {
    const iso = '2026-05-25T16:00:00.000Z'
    expect(normalizeDateKey(iso)).toBe(formatDateKey(new Date(iso)))
  })
})

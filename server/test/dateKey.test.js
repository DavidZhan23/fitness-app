import { describe, expect, it } from 'vitest'
import {
  formatDateKeyInTz,
  isCurrentLogDate,
  isValidDateKey,
  shiftDateKey,
  yesterdayDateKey,
} from '../src/dateKey.js'

describe('dateKey', () => {
  it('formatDateKeyInTz uses DISPLAY_TIMEZONE calendar day', () => {
    const d = new Date('2026-05-23T20:00:00Z')
    expect(formatDateKeyInTz(d)).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('isValidDateKey accepts YYYY-MM-DD only', () => {
    expect(isValidDateKey('2026-05-24')).toBe(true)
    expect(isValidDateKey('2026-5-24')).toBe(false)
  })

  it('shiftDateKey moves calendar days', () => {
    expect(shiftDateKey('2026-05-24', -1)).toBe('2026-05-23')
  })

  it('yesterdayDateKey is shift -1 from today', () => {
    const today = '2026-05-24'
    expect(yesterdayDateKey(today)).toBe('2026-05-23')
  })

  it('isCurrentLogDate is true only for DISPLAY_TIMEZONE today', () => {
    const now = new Date('2026-08-17T04:00:00Z')
    expect(isCurrentLogDate('2026-08-17', now)).toBe(true)
    expect(isCurrentLogDate('2026-08-16', now)).toBe(false)
    expect(isCurrentLogDate(null, now)).toBe(false)
  })
})

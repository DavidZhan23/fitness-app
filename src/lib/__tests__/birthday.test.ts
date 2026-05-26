import { describe, expect, it } from 'vitest'
import { formatTodayDateKey, normalizeBirthdayFromApi } from '../birthday'

describe('birthday', () => {
  it('keeps date-only birthday strings unchanged', () => {
    expect(normalizeBirthdayFromApi('1999-06-19')).toBe('1999-06-19')
  })

  it('normalizes ISO birthday strings to local date key', () => {
    const iso = '1999-06-18T16:00:00.000Z'
    expect(normalizeBirthdayFromApi(iso)).toBe(formatTodayDateKey(new Date(iso)))
  })
})

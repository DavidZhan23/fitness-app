import { describe, expect, it } from 'vitest'
import {
  ageFromBirthdayKey,
  buildProfileUpdate,
  parseBirthdayKey,
} from '../src/profilePatch.js'

describe('buildProfileUpdate', () => {
  it('trims nickname and drops empty string to null', () => {
    const { updates, values } = buildProfileUpdate({ nickname: '  Alice  ' })
    expect(updates).toContain('nickname = $1')
    expect(values[0]).toBe('Alice')
  })

  it('rejects invalid sex enum', () => {
    const { updates } = buildProfileUpdate({ sex: 'other' })
    expect(updates.some((u) => u.startsWith('sex'))).toBe(false)
  })

  it('rounds activity_factor within 1..3', () => {
    const { updates, values } = buildProfileUpdate({ activity_factor: 1.375 })
    expect(updates.some((u) => u.startsWith('activity_factor'))).toBe(true)
    expect(values[0]).toBe(1.375)
  })

  it('parses birthday and derives age', () => {
    const key = '1990-06-15'
    expect(parseBirthdayKey(key)).toBe(key)
    const age = ageFromBirthdayKey(key)
    expect(age).toBeGreaterThan(20)
    const { updates } = buildProfileUpdate({ birthday: key })
    expect(updates.some((u) => u.startsWith('birthday'))).toBe(true)
    expect(updates.some((u) => u.startsWith('age'))).toBe(true)
  })

  it('rejects future birthday', () => {
    expect(parseBirthdayKey('2099-01-01')).toBeNull()
  })
})

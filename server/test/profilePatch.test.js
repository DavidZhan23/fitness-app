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

  it('accepts avatar data URL and clears with null', () => {
    const tiny =
      'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k='
    const { updates, values } = buildProfileUpdate({ avatar_url: tiny })
    expect(updates).toContain('avatar_url = $1')
    expect(values[0]).toBe(tiny)
    const cleared = buildProfileUpdate({ avatar_url: null })
    expect(cleared.updates).toContain('avatar_url = $1')
    expect(cleared.values[0]).toBeNull()
  })

  it('sets community_visible true when completing onboarding without explicit flag', () => {
    const { updates, values } = buildProfileUpdate({ onboarding_complete: true })
    expect(updates).toContain('onboarding_complete = $1')
    expect(updates).toContain('community_visible = $2')
    expect(values).toEqual([true, true])
  })

  it('respects explicit community_visible false when completing onboarding', () => {
    const { updates, values } = buildProfileUpdate({
      onboarding_complete: true,
      community_visible: false,
    })
    expect(updates).toContain('onboarding_complete = $1')
    expect(updates).toContain('community_visible = $2')
    expect(values).toEqual([true, false])
  })

  it('does not auto-open community when onboarding_complete is false', () => {
    const { updates } = buildProfileUpdate({ onboarding_complete: false })
    expect(updates).toContain('onboarding_complete = $1')
    expect(updates.some((u) => u.startsWith('community_visible'))).toBe(false)
  })
})

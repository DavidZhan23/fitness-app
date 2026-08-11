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
    const {
      updates,
      values,
      updatesCommunityVisibility,
      communityVisibilityExplicit,
    } = buildProfileUpdate({ onboarding_complete: true })
    expect(updates).toContain('onboarding_complete = $1')
    expect(updates[1]).toContain(
      'community_visible = case when community_visible_locked_by_developer then false else $2 end',
    )
    expect(values).toEqual([true, true])
    expect(updatesCommunityVisibility).toBe(true)
    expect(communityVisibilityExplicit).toBe(false)
  })

  it('respects explicit community_visible false when completing onboarding', () => {
    const { updates, values, communityVisibilityExplicit } = buildProfileUpdate({
      onboarding_complete: true,
      community_visible: false,
    })
    expect(updates).toContain('onboarding_complete = $1')
    expect(updates).toContain('community_visible = $2')
    expect(values).toEqual([true, false])
    expect(communityVisibilityExplicit).toBe(true)
  })

  it('does not auto-open community when onboarding_complete is false', () => {
    const { updates, updatesCommunityVisibility } = buildProfileUpdate({
      onboarding_complete: false,
    })
    expect(updates).toContain('onboarding_complete = $1')
    expect(updates.some((u) => u.startsWith('community_visible'))).toBe(false)
    expect(updatesCommunityVisibility).toBe(false)
  })

  it('accepts only known metabolism modes', () => {
    const accepted = buildProfileUpdate({ metabolism_mode: 'time_spread' })
    expect(accepted.updates).toContain('metabolism_mode = $1')
    expect(accepted.values).toEqual(['time_spread'])

    const rejected = buildProfileUpdate({ metabolism_mode: 'hourly' })
    expect(rejected.updates.some((u) => u.startsWith('metabolism_mode'))).toBe(false)
  })

  it('accepts app style and normalizes invalid values to default', () => {
    const accepted = buildProfileUpdate({ app_style: 'batman-v-superman' })
    expect(accepted.updates).toContain('app_style = $1')
    expect(accepted.values).toEqual(['batman-v-superman'])

    const normalized = buildProfileUpdate({ app_style: 'unknown-theme' })
    expect(normalized.values).toEqual(['default'])
  })

  it('keeps only boolean hero collab preferences for known themes', () => {
    const result = buildProfileUpdate({
      hero_collab: {
        'batman-v-superman': false,
        eva: true,
        default: true,
        unknown: false,
      },
    })
    expect(result.updates).toContain('hero_collab = $1')
    expect(result.values).toEqual([
      { 'batman-v-superman': false, eva: true },
    ])
  })

  it('does not let profile PATCH change the developer visibility lock', () => {
    const result = buildProfileUpdate({
      community_visible_locked_by_developer: false,
    })
    expect(result.updates).toEqual([])
  })
})

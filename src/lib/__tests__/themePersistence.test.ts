import { describe, expect, it } from 'vitest'
import {
  createSerialThemeWriter,
  normalizeAppStyle,
  readThemePreferenceOwner,
  readStylePreference,
  resolveStylePreference,
  writeStylePreference,
  writeThemePreferenceOwner,
} from '../themePersistence'

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    value: (key: string) => values.get(key),
  }
}

describe('themePersistence', () => {
  it('normalizes current, legacy, and invalid styles', () => {
    expect(normalizeAppStyle('batman-v-superman')).toBe('batman-v-superman')
    expect(normalizeAppStyle('cream')).toBe('lavender')
    expect(normalizeAppStyle('dream')).toBe('sakura')
    expect(normalizeAppStyle('unknown')).toBe('default')
  })

  it('prefers legal localStorage over cookie and falls back to cookie', () => {
    expect(resolveStylePreference('batman-v-superman', 'eva')).toEqual({
      style: 'batman-v-superman',
      source: 'localStorage',
    })
    expect(resolveStylePreference(null, 'batman-v-superman')).toEqual({
      style: 'batman-v-superman',
      source: 'cookie',
    })
    expect(resolveStylePreference('not-a-theme', 'eva')).toEqual({
      style: 'eva',
      source: 'cookie',
    })
  })

  it('writes and reads both localStorage and cookie', () => {
    const storage = memoryStorage()
    const cookieDocument = { cookie: '' }

    writeStylePreference('batman-v-superman', { storage, cookieDocument })

    expect(storage.value('fitness_style')).toBe('batman-v-superman')
    expect(cookieDocument.cookie).toContain('fitness_style=batman-v-superman')
    expect(readStylePreference({ storage, cookieDocument })).toEqual({
      style: 'batman-v-superman',
      source: 'localStorage',
    })
  })

  it('binds local preferences to an account and can clear the owner', () => {
    const storage = memoryStorage()
    const cookieDocument = { cookie: '' }
    writeThemePreferenceOwner('user-a', { storage, cookieDocument })
    expect(readThemePreferenceOwner({ storage, cookieDocument })).toBe('user-a')
    expect(
      readThemePreferenceOwner({
        storage: memoryStorage(),
        cookieDocument,
      }),
    ).toBe('user-a')
    writeThemePreferenceOwner(null, { storage, cookieDocument })
    expect(readThemePreferenceOwner({ storage, cookieDocument })).toBeNull()
    expect(cookieDocument.cookie).toContain('Max-Age=0')
  })

  it('serializes writes and skips queued work after an account switch', async () => {
    const written: string[] = []
    let currentUser = 'user-a'
    let releaseFirst: (() => void) | undefined
    let markFirstStarted: (() => void) | undefined
    const firstPending = new Promise<void>((resolve) => {
      releaseFirst = resolve
    })
    const firstStarted = new Promise<void>((resolve) => {
      markFirstStarted = resolve
    })
    const writer = createSerialThemeWriter<{ value: string }>(
      async ({ value }) => {
        written.push(`start:${value}`)
        if (value === 'a-1') {
          markFirstStarted?.()
          await firstPending
        }
        written.push(`end:${value}`)
      },
      (userId) => userId === currentUser,
    )

    const first = writer.enqueue('user-a', { value: 'a-1' })
    await firstStarted
    const stale = writer.enqueue('user-a', { value: 'a-2' })
    const latest = writer.enqueue('user-b', { value: 'b-1' })
    await Promise.resolve()
    currentUser = 'user-b'
    releaseFirst?.()
    await Promise.all([first, stale, latest])

    expect(written).toEqual(['start:a-1', 'end:a-1', 'start:b-1', 'end:b-1'])
  })
})

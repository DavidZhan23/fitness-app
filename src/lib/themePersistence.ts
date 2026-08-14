import type { AppStyle } from '../types'

export const APP_STYLES = [
  'default',
  'lavender',
  'sakura',
  'sakura-blush',
  'active-mint',
  'eva',
  'eva-unit02',
  'gundam-hangar',
  'jojo-stardust-duel',
  'batman-v-superman',
  'soy-tea',
  'wood-zen',
] as const satisfies readonly AppStyle[]

export const HERO_COLLAB_STYLES = [
  'eva',
  'eva-unit02',
  'gundam-hangar',
  'jojo-stardust-duel',
  'batman-v-superman',
] as const satisfies readonly AppStyle[]

const STYLE_KEY = 'fitness_style'
const PREFERENCE_OWNER_KEY = 'fitness_theme_preference_user_id'
const HERO_COLLAB_KEY_PREFIX = 'fitness_hero_collab_'
const FOX_STAGE_COLLAPSED_KEY = 'fitness_fox_stage_collapsed'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem?(key: string): void
}

interface CookieDocument {
  cookie: string
}

export interface ThemePersistenceEnvironment {
  storage?: KeyValueStorage | null
  cookieDocument?: CookieDocument | null
}

export type PreferenceSource = 'localStorage' | 'cookie' | 'default'

export interface StylePreference {
  style: AppStyle
  source: PreferenceSource
}

export interface BooleanPreference {
  enabled: boolean
  source: PreferenceSource
}

export function isAppStyle(value: unknown): value is AppStyle {
  return typeof value === 'string' && APP_STYLES.includes(value as AppStyle)
}

function isLegacyStyle(value: unknown): value is string {
  return (
    value === 'cream' ||
    value === 'aqua' ||
    value === 'dream' ||
    value === 'abyssal-jade'
  )
}

/** 将旧主题名迁移到当前白名单；未知值按 default 处理。 */
export function normalizeAppStyle(value: unknown): AppStyle {
  if (isAppStyle(value)) return value
  if (value === 'cream') return 'lavender'
  if (value === 'aqua' || value === 'dream') return 'sakura'
  if (value === 'abyssal-jade') return 'default'
  return 'default'
}

function browserEnvironment(): ThemePersistenceEnvironment {
  return {
    storage: typeof localStorage === 'undefined' ? null : localStorage,
    cookieDocument: typeof document === 'undefined' ? null : document,
  }
}

function readStorage(storage: KeyValueStorage | null | undefined, key: string) {
  try {
    return storage?.getItem(key) ?? null
  } catch {
    return null
  }
}

function writeStorage(
  storage: KeyValueStorage | null | undefined,
  key: string,
  value: string,
) {
  try {
    storage?.setItem(key, value)
  } catch {
    // 某些隐私模式会拒绝 localStorage；Cookie 仍作为本地降级。
  }
}

function removeStorage(
  storage: KeyValueStorage | null | undefined,
  key: string,
) {
  try {
    storage?.removeItem?.(key)
  } catch {
    // 忽略受限存储；服务端 profile 仍是账号真相。
  }
}

function readCookie(cookieHeader: string, key: string): string | null {
  const item = cookieHeader
    .split('; ')
    .find((pair) => pair.startsWith(`${key}=`))
  if (!item) return null
  try {
    return decodeURIComponent(item.slice(key.length + 1))
  } catch {
    return null
  }
}

function writeCookie(
  cookieDocument: CookieDocument | null | undefined,
  key: string,
  value: string,
) {
  if (!cookieDocument) return
  cookieDocument.cookie = `${key}=${encodeURIComponent(value)}; Max-Age=${COOKIE_MAX_AGE}; Path=/; SameSite=Lax`
}

function removeCookie(
  cookieDocument: CookieDocument | null | undefined,
  key: string,
) {
  if (!cookieDocument) return
  cookieDocument.cookie = `${key}=; Max-Age=0; Path=/; SameSite=Lax`
}

export function resolveStylePreference(
  localValue: string | null,
  cookieValue: string | null,
): StylePreference {
  if (localValue != null && (isAppStyle(localValue) || isLegacyStyle(localValue))) {
    return { style: normalizeAppStyle(localValue), source: 'localStorage' }
  }
  if (cookieValue != null && (isAppStyle(cookieValue) || isLegacyStyle(cookieValue))) {
    return { style: normalizeAppStyle(cookieValue), source: 'cookie' }
  }
  return { style: 'default', source: 'default' }
}

export function readStylePreference(
  env: ThemePersistenceEnvironment = browserEnvironment(),
): StylePreference {
  return resolveStylePreference(
    readStorage(env.storage, STYLE_KEY),
    readCookie(env.cookieDocument?.cookie ?? '', STYLE_KEY),
  )
}

export function writeStylePreference(
  style: AppStyle,
  env: ThemePersistenceEnvironment = browserEnvironment(),
) {
  writeStorage(env.storage, STYLE_KEY, style)
  writeCookie(env.cookieDocument, STYLE_KEY, style)
}

export function readThemePreferenceOwner(
  env: ThemePersistenceEnvironment = browserEnvironment(),
) {
  return (
    readStorage(env.storage, PREFERENCE_OWNER_KEY) ||
    readCookie(env.cookieDocument?.cookie ?? '', PREFERENCE_OWNER_KEY) ||
    null
  )
}

export function writeThemePreferenceOwner(
  userId: string | null,
  env: ThemePersistenceEnvironment = browserEnvironment(),
) {
  if (userId) {
    writeStorage(env.storage, PREFERENCE_OWNER_KEY, userId)
    writeCookie(env.cookieDocument, PREFERENCE_OWNER_KEY, userId)
  } else {
    removeStorage(env.storage, PREFERENCE_OWNER_KEY)
    removeCookie(env.cookieDocument, PREFERENCE_OWNER_KEY)
  }
}

/** 同一账号的偏好 PATCH 串行执行；切换账号后，尚未开始的旧任务会被丢弃。 */
export function createSerialThemeWriter<T>(
  write: (payload: T) => Promise<unknown>,
  isCurrentUser: (userId: string) => boolean,
) {
  let chain = Promise.resolve()
  return {
    enqueue(userId: string, payload: T) {
      chain = chain
        .catch(() => {})
        .then(async () => {
          if (!isCurrentUser(userId)) return
          await write(payload)
        })
      return chain
    },
  }
}

function heroCollabKey(style: AppStyle) {
  return `${HERO_COLLAB_KEY_PREFIX}${style}`
}

function parseBoolean(value: string | null): boolean | null {
  if (value === '1') return true
  if (value === '0') return false
  return null
}

export function readHeroCollabPreference(
  style: AppStyle,
  defaultEnabled: boolean,
  env: ThemePersistenceEnvironment = browserEnvironment(),
): BooleanPreference {
  const key = heroCollabKey(style)
  const local = parseBoolean(readStorage(env.storage, key))
  if (local != null) return { enabled: local, source: 'localStorage' }
  const cookie = parseBoolean(readCookie(env.cookieDocument?.cookie ?? '', key))
  if (cookie != null) return { enabled: cookie, source: 'cookie' }
  return { enabled: defaultEnabled, source: 'default' }
}

export function writeHeroCollabPreference(
  style: AppStyle,
  enabled: boolean,
  env: ThemePersistenceEnvironment = browserEnvironment(),
) {
  const key = heroCollabKey(style)
  const value = enabled ? '1' : '0'
  writeStorage(env.storage, key, value)
  writeCookie(env.cookieDocument, key, value)
}

export function readFoxStageCollapsedPreference(
  env: ThemePersistenceEnvironment = browserEnvironment(),
): BooleanPreference {
  const local = parseBoolean(readStorage(env.storage, FOX_STAGE_COLLAPSED_KEY))
  if (local != null) return { enabled: local, source: 'localStorage' }
  const cookie = parseBoolean(
    readCookie(env.cookieDocument?.cookie ?? '', FOX_STAGE_COLLAPSED_KEY),
  )
  if (cookie != null) return { enabled: cookie, source: 'cookie' }
  return { enabled: false, source: 'default' }
}

export function writeFoxStageCollapsedPreference(
  collapsed: boolean,
  env: ThemePersistenceEnvironment = browserEnvironment(),
) {
  const value = collapsed ? '1' : '0'
  writeStorage(env.storage, FOX_STAGE_COLLAPSED_KEY, value)
  writeCookie(env.cookieDocument, FOX_STAGE_COLLAPSED_KEY, value)
}

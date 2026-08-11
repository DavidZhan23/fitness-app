import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from './AuthContext'
import { httpData } from '../lib/api'
import { getHeroCollabConfig } from '../lib/themeMeta'
import {
  HERO_COLLAB_STYLES,
  createSerialThemeWriter,
  isAppStyle,
  normalizeAppStyle,
  readHeroCollabPreference,
  readStylePreference,
  readThemePreferenceOwner,
  writeHeroCollabPreference,
  writeStylePreference,
  writeThemePreferenceOwner,
  type BooleanPreference,
} from '../lib/themePersistence'
import type {
  AppStyle,
  HeroCollabPreferences,
  Profile,
} from '../types'

export type { AppStyle } from '../types'

interface StyleContextValue {
  style: AppStyle
  setStyle: (next: AppStyle) => void
  isHeroCollabEnabled: (style: AppStyle) => boolean
  setHeroCollabEnabled: (style: AppStyle, next: boolean) => void
}

interface InitialHeroPreferences {
  values: HeroCollabPreferences
  sources: Partial<Record<AppStyle, BooleanPreference['source']>>
}

const StyleContext = createContext<StyleContextValue | null>(null)

function buildInitialHeroPreferences(): InitialHeroPreferences {
  const values: HeroCollabPreferences = {}
  const sources: InitialHeroPreferences['sources'] = {}
  for (const style of HERO_COLLAB_STYLES) {
    const config = getHeroCollabConfig(style)
    if (!config) continue
    const preference = readHeroCollabPreference(style, config.defaultEnabled)
    values[style] = preference.enabled
    sources[style] = preference.source
  }
  return { values, sources }
}

function defaultHeroCollabPreferences(): HeroCollabPreferences {
  const values: HeroCollabPreferences = {}
  for (const style of HERO_COLLAB_STYLES) {
    const config = getHeroCollabConfig(style)
    if (config) values[style] = config.defaultEnabled
  }
  return values
}

function normalizeServerHeroCollab(value: Profile['hero_collab']) {
  const out: HeroCollabPreferences = {}
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out
  for (const style of HERO_COLLAB_STYLES) {
    if (typeof value[style] === 'boolean') out[style] = value[style]
  }
  return out
}

export function StyleProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth()
  const [initialStylePreference] = useState(readStylePreference)
  const [initialHeroPreferences] = useState(buildInitialHeroPreferences)
  const [style, setStyleState] = useState<AppStyle>(initialStylePreference.style)
  const [heroCollabByStyle, setHeroCollabByStyle] =
    useState<HeroCollabPreferences>(initialHeroPreferences.values)

  const styleRef = useRef(style)
  const heroCollabRef = useRef(heroCollabByStyle)
  const userRef = useRef(user)
  const profileRef = useRef(profile)
  const hydratedUserRef = useRef<string | null>(null)
  const preferenceOwnerRef = useRef(readThemePreferenceOwner())
  const styleExplicitRef = useRef(initialStylePreference.source !== 'default')
  const heroExplicitStylesRef = useRef<Set<AppStyle>>(
    new Set<AppStyle>(
      HERO_COLLAB_STYLES.filter(
        (target) => initialHeroPreferences.sources[target] !== 'default',
      ),
    ),
  )
  const writerRef = useRef<
    ReturnType<typeof createSerialThemeWriter<Partial<Profile>>> | undefined
  >(undefined)

  userRef.current = user
  profileRef.current = profile
  if (!writerRef.current) {
    writerRef.current = createSerialThemeWriter<Partial<Profile>>(
      (payload) => httpData.updateProfile(payload),
      (userId) => userRef.current?.id === userId,
    )
  }

  const enqueueProfilePreference = useCallback(
    (userId: string, payload: Partial<Profile>) => {
      void writerRef.current?.enqueue(userId, payload).catch(console.error)
    },
    [],
  )

  const bindLocalPreferencesToUser = useCallback((userId: string | null) => {
    preferenceOwnerRef.current = userId
    writeThemePreferenceOwner(userId)
  }, [])

  const applyLocalStyle = useCallback((next: AppStyle) => {
    styleRef.current = next
    setStyleState(next)
    writeStylePreference(next)
  }, [])

  const applyLocalHeroPreferences = useCallback(
    (next: HeroCollabPreferences) => {
      heroCollabRef.current = next
      setHeroCollabByStyle(next)
      for (const target of HERO_COLLAB_STYLES) {
        const enabled = next[target]
        if (typeof enabled === 'boolean') {
          writeHeroCollabPreference(target, enabled)
        }
      }
    },
    [],
  )

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.dataset.style = style
    writeStylePreference(style)
  }, [style])

  useEffect(() => {
    if (typeof document === 'undefined') return
    const config = getHeroCollabConfig(style)
    const enabled = heroCollabByStyle[style] ?? config?.defaultEnabled ?? false
    document.documentElement.dataset.heroCollab =
      config && enabled ? 'on' : 'off'
  }, [style, heroCollabByStyle])

  useEffect(() => {
    if (!user || !profile) {
      if (!user) hydratedUserRef.current = null
      return
    }
    if (hydratedUserRef.current === user.id) return
    hydratedUserRef.current = user.id

    const ownerBeforeHydration = preferenceOwnerRef.current
    const canMigrateLocal =
      ownerBeforeHydration == null || ownerBeforeHydration === user.id

    const rawServerStyle = profile.app_style
    if (rawServerStyle == null) {
      if (
        profile.onboarding_complete &&
        canMigrateLocal &&
        styleExplicitRef.current
      ) {
        enqueueProfilePreference(user.id, { app_style: styleRef.current })
      } else if (!profile.onboarding_complete || !canMigrateLocal) {
        styleExplicitRef.current = false
        applyLocalStyle('default')
      }
    } else {
      const serverStyle = normalizeAppStyle(rawServerStyle)
      styleExplicitRef.current = true
      applyLocalStyle(serverStyle)
      if (profile.onboarding_complete && !isAppStyle(rawServerStyle)) {
        enqueueProfilePreference(user.id, { app_style: serverStyle })
      }
    }

    if (profile.hero_collab == null) {
      if (profile.onboarding_complete && canMigrateLocal) {
        const localOverrides = Object.fromEntries(
          [...heroExplicitStylesRef.current].map((target) => [
            target,
            heroCollabRef.current[target],
          ]),
        ) as HeroCollabPreferences
        if (Object.keys(localOverrides).length > 0) {
          enqueueProfilePreference(user.id, { hero_collab: localOverrides })
        }
      } else if (!profile.onboarding_complete || !canMigrateLocal) {
        heroExplicitStylesRef.current.clear()
        applyLocalHeroPreferences(defaultHeroCollabPreferences())
      }
    } else {
      const serverOverrides = normalizeServerHeroCollab(profile.hero_collab)
      heroExplicitStylesRef.current = new Set(
        Object.keys(serverOverrides) as AppStyle[],
      )
      applyLocalHeroPreferences({
        ...defaultHeroCollabPreferences(),
        ...serverOverrides,
      })
      if (
        typeof profile.hero_collab !== 'object' ||
        Array.isArray(profile.hero_collab)
      ) {
        enqueueProfilePreference(user.id, { hero_collab: {} })
      }
    }

    bindLocalPreferencesToUser(user.id)
  }, [
    applyLocalHeroPreferences,
    applyLocalStyle,
    bindLocalPreferencesToUser,
    enqueueProfilePreference,
    profile,
    user,
  ])

  const setStyle = useCallback(
    (next: AppStyle) => {
      styleExplicitRef.current = true
      applyLocalStyle(next)

      const activeUser = userRef.current
      if (!activeUser) {
        bindLocalPreferencesToUser(null)
        return
      }
      bindLocalPreferencesToUser(activeUser.id)

      // Onboarding 只做本地预览，完成时由 completeOnboarding await 最终主题。
      if (!profileRef.current?.onboarding_complete) return
      enqueueProfilePreference(activeUser.id, { app_style: next })
    },
    [applyLocalStyle, bindLocalPreferencesToUser, enqueueProfilePreference],
  )

  const isHeroCollabEnabled = useCallback((target: AppStyle) => {
    return (
      heroCollabRef.current[target] ??
      getHeroCollabConfig(target)?.defaultEnabled ??
      false
    )
  }, [])

  const setHeroCollabEnabled = useCallback(
    (target: AppStyle, next: boolean) => {
      const updated = { ...heroCollabRef.current, [target]: next }
      heroCollabRef.current = updated
      heroExplicitStylesRef.current.add(target)
      setHeroCollabByStyle(updated)
      writeHeroCollabPreference(target, next)

      const activeUser = userRef.current
      if (!activeUser) {
        bindLocalPreferencesToUser(null)
        return
      }
      bindLocalPreferencesToUser(activeUser.id)
      if (!profileRef.current?.onboarding_complete) return
      enqueueProfilePreference(activeUser.id, { hero_collab: updated })
    },
    [bindLocalPreferencesToUser, enqueueProfilePreference],
  )

  const value = useMemo(
    () => ({
      style,
      setStyle,
      isHeroCollabEnabled,
      setHeroCollabEnabled,
    }),
    [style, setStyle, isHeroCollabEnabled, setHeroCollabEnabled],
  )

  return <StyleContext.Provider value={value}>{children}</StyleContext.Provider>
}

export function useAppStyle() {
  const ctx = useContext(StyleContext)
  if (!ctx) throw new Error('useAppStyle must be used within StyleProvider')
  return ctx
}

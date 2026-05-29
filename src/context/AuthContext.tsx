import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { httpAuth, httpData, type AppUser } from '../lib/api'
import { getStoredToken } from '../lib/api/http'
import {
  calculateBmr,
  calculateTdee,
  resolveProfileMetabolism,
} from '../lib/calories'
import { ageFromBirthdayKey, parseBirthdayKey } from '../lib/birthday'
import {
  clearTemplatesSeededForUser,
  markTemplatesSeededForUser,
  shouldSeedTemplatesForUser,
} from '../lib/defaultTemplates'
import { buildProfilePatchBody, mergeProfileForCalc } from '../lib/profilePayload'
import { seedDefaultTemplates } from '../lib/dayLogService'
import { isBackendConfigured } from '../lib/config'
import type { Profile, Sex } from '../types'

interface AuthContextValue {
  user: AppUser | null
  profile: Profile | null
  loading: boolean
  refreshProfile: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (
    email: string,
    password: string,
    registrationKey: string,
  ) => Promise<{ needsEmailConfirmation: boolean }>
  signOut: () => Promise<void>
  updateProfile: (data: Partial<Profile>) => Promise<void>
  completeOnboarding: (data: {
    weight_kg: number
    height_cm: number
    birthday: string
    sex: Sex
    activity_factor: number
  }) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const mergeProfileFromApi = useCallback((raw: Profile): Profile => {
    const computed = resolveProfileMetabolism(raw)
    return { ...raw, bmr: computed.bmr, tdee: computed.tdee }
  }, [])

  const applyProfile = useCallback(
    async (raw: Profile, userId: string) => {
      const synced = mergeProfileFromApi(raw)
      setProfile(synced)
      if (shouldSeedTemplatesForUser(userId)) {
        markTemplatesSeededForUser(userId)
        seedDefaultTemplates(userId).catch(() => {
          clearTemplatesSeededForUser(userId)
        })
      }
      return synced
    },
    [mergeProfileFromApi],
  )

  const fetchProfile = useCallback(
    async (userId: string) => {
      const data = await httpData.getProfile()
      return applyProfile(data as Profile, userId)
    },
    [applyProfile],
  )

  const refreshProfile = useCallback(async () => {
    if (!user) return
    await fetchProfile(user.id)
  }, [user, fetchProfile])

  useEffect(() => {
    if (!isBackendConfigured) {
      setLoading(false)
      return
    }
    const token = getStoredToken()
    if (!token) {
      setLoading(false)
      return
    }

    let cancelled = false

    void (async () => {
      try {
        const [{ user: u }, profileData] = await Promise.all([
          httpAuth.getSession(),
          httpData.getProfile().catch(() => null),
        ])
        if (cancelled) return
        setUser(u)
        if (u && profileData) {
          await applyProfile(profileData as Profile, u.id)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [applyProfile])

  useEffect(() => {
    if (!user) {
      setProfile(null)
      return
    }
    if (profile) return
    fetchProfile(user.id).catch(console.error)
  }, [user?.id, fetchProfile, profile])

  const signIn = async (email: string, password: string) => {
    const { user: u } = await httpAuth.signIn(email, password)
    setUser(u)
  }

  const signUp = async (
    email: string,
    password: string,
    registrationKey: string,
  ) => {
    await httpAuth.signUp(email, password, registrationKey)
    const { user: u } = await httpAuth.getSession()
    setUser(u)
    return { needsEmailConfirmation: false }
  }

  const signOut = async () => {
    await httpAuth.signOut()
    setUser(null)
    setProfile(null)
  }

  const updateProfile = useCallback(
    async (data: Partial<Profile>) => {
      if (!user) return

      const snapshot = profile
      setProfile((prev) => (prev ? { ...prev, ...data } : prev))

      let bmr: number | null = null
      let tdee: number | null = null
      const merged = mergeProfileForCalc(data, snapshot)
      if (merged) {
        bmr = calculateBmr(
          merged.weight_kg,
          merged.height_cm,
          merged.age,
          merged.sex,
        )
        tdee = calculateTdee(bmr, merged.activity_factor)
      }

      const payload = buildProfilePatchBody(data, bmr, tdee)
      if (Object.keys(payload).length === 0) {
        if (snapshot) setProfile(snapshot)
        throw new Error('请填写有效的身体资料')
      }

      try {
        const saved = await httpData.updateProfile(payload)
        setProfile(mergeProfileFromApi(saved as Profile))
      } catch (err) {
        if (snapshot) {
          setProfile(snapshot)
        } else {
          await fetchProfile(user.id).catch(() => {})
        }
        throw err
      }
    },
    [user, profile, mergeProfileFromApi, fetchProfile],
  )

  const completeOnboarding = async (data: {
    weight_kg: number
    height_cm: number
    birthday: string
    sex: Sex
    activity_factor: number
  }) => {
    if (!user) return
    const parsedBirthday = parseBirthdayKey(data.birthday)
    const age = parsedBirthday ? ageFromBirthdayKey(parsedBirthday) : null
    if (!parsedBirthday || age == null) {
      throw new Error('请填写有效的生日')
    }
    const bmr = calculateBmr(data.weight_kg, data.height_cm, age, data.sex)
    const tdee = calculateTdee(bmr, data.activity_factor)
    const payload = buildProfilePatchBody(
      { ...data, age, birthday: parsedBirthday, onboarding_complete: true },
      bmr,
      tdee,
    )
    await httpData.updateProfile(payload)
    await refreshProfile()
  }

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      refreshProfile,
      signIn,
      signUp,
      signOut,
      updateProfile,
      completeOnboarding,
    }),
    [user, profile, loading, refreshProfile, updateProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

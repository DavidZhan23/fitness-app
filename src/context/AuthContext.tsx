import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { httpAuth, httpData } from '../lib/api'
import {
  calculateBmr,
  calculateTdee,
  resolveProfileMetabolism,
} from '../lib/calories'
import { buildProfilePatchBody, mergeProfileForCalc } from '../lib/profilePayload'
import { seedDefaultTemplates } from '../lib/dayLogService'
import { isBackendConfigured, isSelfHosted } from '../lib/config'
import { assertRegistrationKey } from '../lib/registrationKey'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { Profile, Sex } from '../types'

export interface AppUser {
  id: string
  email: string
}

interface AuthContextValue {
  session: Session | null
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
    age: number
    sex: Sex
    activity_factor: number
  }) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
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
      seedDefaultTemplates(userId).catch(() => {})
      return synced
    },
    [mergeProfileFromApi],
  )

  const fetchProfile = useCallback(
    async (userId: string) => {
      if (isSelfHosted) {
        const data = await httpData.getProfile(userId)
        return applyProfile(data as Profile, userId)
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (error) throw error
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

    if (isSelfHosted) {
      httpAuth.getSession().then(({ user: u }) => {
        setUser(u)
        setLoading(false)
      })
      return
    }

    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUser(
        data.session?.user
          ? { id: data.session.user.id, email: data.session.user.email ?? '' }
          : null,
      )
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(
        nextSession?.user
          ? { id: nextSession.user.id, email: nextSession.user.email ?? '' }
          : null,
      )
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) {
      setProfile(null)
      return
    }
    fetchProfile(user.id).catch(console.error)
  }, [user?.id, fetchProfile])

  const signIn = async (email: string, password: string) => {
    if (isSelfHosted) {
      const { user: u } = await httpAuth.signIn(email, password)
      setUser(u)
      return
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signUp = async (
    email: string,
    password: string,
    registrationKey: string,
  ) => {
    if (isSelfHosted) {
      await httpAuth.signUp(email, password, registrationKey)
      const { user: u } = await httpAuth.getSession()
      setUser(u)
      return { needsEmailConfirmation: false }
    }
    assertRegistrationKey(registrationKey)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/` },
    })
    if (error) throw error
    return { needsEmailConfirmation: Boolean(data.user && !data.session) }
  }

  const signOut = async () => {
    if (isSelfHosted) {
      await httpAuth.signOut()
      setUser(null)
      setProfile(null)
      return
    }
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setProfile(null)
  }

  const updateProfile = async (data: Partial<Profile>) => {
    if (!user) return

    let bmr: number | null = null
    let tdee: number | null = null
    const merged = mergeProfileForCalc(data, profile)
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
      throw new Error('请填写有效的身体资料')
    }

    if (isSelfHosted) {
      const saved = await httpData.updateProfile(user.id, payload)
      setProfile(mergeProfileFromApi(saved as Profile))
      return
    }

    const { data: row, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', user.id)
      .select()
      .single()
    if (error) throw error
    setProfile(mergeProfileFromApi(row as Profile))
  }

  const completeOnboarding = async (data: {
    weight_kg: number
    height_cm: number
    age: number
    sex: Sex
    activity_factor: number
  }) => {
    if (!user) return
    const bmr = calculateBmr(data.weight_kg, data.height_cm, data.age, data.sex)
    const tdee = calculateTdee(bmr, data.activity_factor)
    const payload = buildProfilePatchBody(
      { ...data, onboarding_complete: true },
      bmr,
      tdee,
    )

    if (isSelfHosted) {
      await httpData.updateProfile(user.id, payload)
      await refreshProfile()
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', user.id)
    if (error) throw error
    await refreshProfile()
  }

  const value = useMemo(
    () => ({
      session,
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
    [session, user, profile, loading, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

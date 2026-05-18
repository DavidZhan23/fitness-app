import {
  DEFAULT_EXERCISE_TEMPLATES,
  DEFAULT_MEAL_TEMPLATES,
} from '../defaultTemplates'
import type { DayLog, Exercise, Meal, Profile } from '../../types'
import { apiFetch, getStoredToken, setStoredToken } from './http'

export const httpAuth = {
  async getSession() {
    const token = getStoredToken()
    if (!token) return { user: null as { id: string; email: string } | null }
    try {
      const data = await apiFetch<{ user: { id: string; email: string } }>('/auth/me')
      return { user: data.user }
    } catch {
      setStoredToken(null)
      return { user: null }
    }
  },

  async signIn(email: string, password: string) {
    const data = await apiFetch<{
      token: string
      user: { id: string; email: string }
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    setStoredToken(data.token)
    return { user: data.user, needsEmailConfirmation: false }
  },

  async signUp(email: string, password: string) {
    const data = await apiFetch<{
      token: string
      user: { id: string; email: string }
      needsEmailConfirmation: boolean
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    setStoredToken(data.token)
    return { user: data.user, needsEmailConfirmation: false }
  },

  async signOut() {
    setStoredToken(null)
  },
}

export const httpData = {
  async getProfile(_userId: string): Promise<Profile> {
    return apiFetch<Profile>('/profile')
  },

  async updateProfile(
    _userId: string,
    data: Partial<Profile> | Record<string, string | number | boolean>,
  ): Promise<Profile> {
    return apiFetch<Profile>('/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async fetchDayLogWithItems(
    _userId: string,
    logDate: string,
    profile: Profile,
  ): Promise<{ dayLog: DayLog; exercises: Exercise[]; meals: Meal[] }> {
    const tdee = profile.tdee ?? 0
    await apiFetch<DayLog>('/day-logs/ensure', {
      method: 'POST',
      body: JSON.stringify({ log_date: logDate, tdee_snapshot: tdee }),
    }).catch(() => null)
    return apiFetch(`/day-logs/${logDate}`)
  },

  async addExercise(
    _userId: string,
    dayLogId: string,
    name: string,
    kcal: number,
  ): Promise<void> {
    await apiFetch('/exercises', {
      method: 'POST',
      body: JSON.stringify({ day_log_id: dayLogId, name, kcal }),
    })
  },

  async addMeal(
    _userId: string,
    dayLogId: string,
    name: string,
    kcal: number,
  ): Promise<void> {
    await apiFetch('/meals', {
      method: 'POST',
      body: JSON.stringify({ day_log_id: dayLogId, name, kcal }),
    })
  },

  async deleteExercise(id: string): Promise<void> {
    await apiFetch(`/exercises/${id}`, { method: 'DELETE' })
  },

  async deleteMeal(id: string): Promise<void> {
    await apiFetch(`/meals/${id}`, { method: 'DELETE' })
  },

  async getOrCreateDayLog(
    _userId: string,
    logDate: string,
    tdeeSnapshot: number,
  ): Promise<DayLog> {
    return apiFetch<DayLog>('/day-logs/ensure', {
      method: 'POST',
      body: JSON.stringify({ log_date: logDate, tdee_snapshot: tdeeSnapshot }),
    })
  },

  async fetchDayLogsRange(
    _userId: string,
    from: string,
    to: string,
  ): Promise<DayLog[]> {
    return apiFetch<DayLog[]>(`/day-logs/range?from=${from}&to=${to}`)
  },

  async fetchDayLogByDate(_userId: string, date: string): Promise<DayLog | null> {
    try {
      const data = await apiFetch<{ dayLog: DayLog }>(`/day-logs/${date}`)
      return data.dayLog
    } catch {
      return null
    }
  },

  async listTemplates(type: 'exercise' | 'meal') {
    return apiFetch<{ id: string; name: string; kcal: number }[]>(
      `/templates/${type}`,
    )
  },

  async addTemplate(type: 'exercise' | 'meal', name: string, kcal: number) {
    return apiFetch(`/templates/${type}`, {
      method: 'POST',
      body: JSON.stringify({ name, kcal }),
    })
  },

  async deleteTemplate(type: 'exercise' | 'meal', id: string) {
    await apiFetch(`/templates/${type}/${id}`, { method: 'DELETE' })
  },

  async seedDefaultTemplates(_userId: string): Promise<void> {
    await apiFetch('/templates/seed', {
      method: 'POST',
      body: JSON.stringify({
        exerciseTemplates: DEFAULT_EXERCISE_TEMPLATES,
        mealTemplates: DEFAULT_MEAL_TEMPLATES,
      }),
    })
  },
}

import {
  DEFAULT_EXERCISE_TEMPLATES,
  DEFAULT_MEAL_TEMPLATES,
} from '../defaultTemplates'
import type {
  CommunityMember,
  CommunityUserDetail,
  DayComment,
  DayLog,
  Exercise,
  Meal,
  Profile,
} from '../../types'
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

  async signUp(email: string, password: string, registrationKey: string) {
    const data = await apiFetch<{
      token: string
      user: { id: string; email: string }
      needsEmailConfirmation: boolean
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        registration_key: registrationKey,
      }),
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

  async updateExercise(
    id: string,
    name: string,
    kcal: number,
  ): Promise<Exercise> {
    return apiFetch<Exercise>(`/exercises/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name, kcal }),
    })
  },

  async updateMeal(id: string, name: string, kcal: number): Promise<Meal> {
    return apiFetch<Meal>(`/meals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name, kcal }),
    })
  },

  async deleteExercise(id: string): Promise<void> {
    await apiFetch(`/exercises/${id}`, { method: 'DELETE' })
  },

  async deleteMeal(id: string): Promise<void> {
    await apiFetch(`/meals/${id}`, { method: 'DELETE' })
  },

  async getCommunityInboxUnread(): Promise<{ count: number }> {
    return apiFetch('/community/inbox/unread')
  },

  async markCommunityInboxRead(): Promise<{ ok: boolean; count: number }> {
    return apiFetch('/community/inbox/mark-read', { method: 'POST' })
  },

  async estimateKcal(
    type: 'exercise' | 'meal',
    description: string,
    init?: { signal?: AbortSignal },
  ): Promise<{ kcal: number }> {
    return apiFetch('/ai/estimate-kcal', {
      method: 'POST',
      body: JSON.stringify({ type, description }),
      signal: init?.signal,
    })
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

  async listCommunityMembers(
    clientToday: string,
    filter: 'all' | 'following' = 'all',
  ): Promise<{
    members: CommunityMember[]
    today: string
    filter: string
  }> {
    return apiFetch(
      `/community/members?today=${encodeURIComponent(clientToday)}&filter=${filter}`,
    )
  },

  async saveCommunityMemberOrder(memberIds: string[]): Promise<{ ok: boolean }> {
    return apiFetch('/community/member-order', {
      method: 'PUT',
      body: JSON.stringify({ memberIds }),
    })
  },

  async getCommunityUser(
    userId: string,
    date?: string,
  ): Promise<CommunityUserDetail> {
    const q = date ? `?date=${encodeURIComponent(date)}` : ''
    return apiFetch(`/community/users/${userId}${q}`)
  },

  async setCommunityLogItemReaction(
    userId: string,
    itemType: 'exercise' | 'meal',
    itemId: string,
    reaction: 'up' | 'down' | null,
  ): Promise<{
    thumbsUp: number
    thumbsDown: number
    viewerReaction: 'up' | 'down' | null
  }> {
    return apiFetch(
      `/community/users/${userId}/log-items/${itemType}/${itemId}/reaction`,
      {
        method: 'PUT',
        body: JSON.stringify({ reaction }),
      },
    )
  },

  async followCommunityUser(userId: string): Promise<{ following: boolean }> {
    return apiFetch(`/community/users/${userId}/follow`, { method: 'POST' })
  },

  async unfollowCommunityUser(userId: string): Promise<{ following: boolean }> {
    return apiFetch(`/community/users/${userId}/follow`, { method: 'DELETE' })
  },

  async likeCommunityDay(
    userId: string,
    date: string,
  ): Promise<{ likeCount: number; viewerLiked: boolean }> {
    return apiFetch(`/community/users/${userId}/likes`, {
      method: 'POST',
      body: JSON.stringify({ date }),
    })
  },

  async unlikeCommunityDay(
    userId: string,
    date: string,
  ): Promise<{ likeCount: number; viewerLiked: boolean }> {
    return apiFetch(
      `/community/users/${userId}/likes?date=${encodeURIComponent(date)}`,
      { method: 'DELETE' },
    )
  },

  async postCommunityComment(
    userId: string,
    date: string,
    body: string,
  ): Promise<DayComment> {
    return apiFetch(`/community/users/${userId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ date, body }),
    })
  },

  async deleteCommunityComment(commentId: string): Promise<void> {
    await apiFetch(`/community/comments/${commentId}`, { method: 'DELETE' })
  },

  async getCommunityUserMonth(
    userId: string,
    year: number,
    month: number,
  ): Promise<{
    member: { id: string; nickname: string; isSelf: boolean }
    year: number
    month: number
    logs: DayLog[]
    dailyBmr: number
    threshold: number
    accountStartKey: string | null
  }> {
    return apiFetch(
      `/community/users/${userId}/month?year=${year}&month=${month}`,
    )
  },
}

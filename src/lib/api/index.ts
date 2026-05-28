import {
  DEFAULT_EXERCISE_TEMPLATES,
  DEFAULT_MEAL_TEMPLATES,
} from '../defaultTemplates'
import type {
  CommunityInboxSummary,
  CommunityMember,
  CommunityUserDetail,
  DayComment,
  DayLog,
  Exercise,
  Meal,
  Profile,
  WeeklyReportDetail,
  WeeklyReportSummary,
} from '../../types'

export interface AppUser {
  id: string
  email: string
  isDeveloper?: boolean
}
import { apiFetch, getStoredToken, setStoredToken } from './http'

export const httpAuth = {
  async getSession() {
    const token = getStoredToken()
    if (!token) return { user: null as AppUser | null }
    try {
      const data = await apiFetch<{ user: AppUser }>('/auth/me')
      return { user: data.user }
    } catch {
      setStoredToken(null)
      return { user: null }
    }
  },

  async signIn(email: string, password: string) {
    const data = await apiFetch<{
      token: string
      user: AppUser
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
      user: AppUser
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
  async getProfile(): Promise<Profile> {
    return apiFetch<Profile>('/profile')
  },

  async updateProfile(
    data: Partial<Profile> | Record<string, string | number | boolean>,
  ): Promise<Profile> {
    return apiFetch<Profile>('/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async fetchDayLogWithItems(
    logDate: string,
    _profile: Profile,
  ): Promise<{ dayLog: DayLog; exercises: Exercise[]; meals: Meal[] }> {
    return apiFetch(`/day-logs/${logDate}`)
  },

  async addExercise(
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

  async getCommunityInboxUnread(): Promise<CommunityInboxSummary> {
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

  async ingestTelemetryEvents(
    events: {
      name: string
      route?: string
      durationMs?: number
      metadata?: Record<string, unknown>
      clientAt?: string
      sessionId?: string
      appVersion?: string
      commitSha?: string
    }[],
  ): Promise<{ inserted: number }> {
    return apiFetch('/telemetry/events', {
      method: 'POST',
      body: JSON.stringify({ events }),
      keepalive: true,
    })
  },

  async getOrCreateDayLog(
    logDate: string,
    tdeeSnapshot: number,
  ): Promise<DayLog> {
    return apiFetch<DayLog>('/day-logs/ensure', {
      method: 'POST',
      body: JSON.stringify({ log_date: logDate, tdee_snapshot: tdeeSnapshot }),
    })
  },

  async fetchDayLogsRange(from: string, to: string): Promise<DayLog[]> {
    return apiFetch<DayLog[]>(`/day-logs/range?from=${from}&to=${to}`)
  },

  async fetchDayLogByDate(date: string): Promise<DayLog | null> {
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

  async seedDefaultTemplates(): Promise<void> {
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

  async setDayCommunityVisible(
    date: string,
    visible: boolean,
  ): Promise<{ log_date: string; community_visible: boolean }> {
    return apiFetch(`/community/days/${encodeURIComponent(date)}/visible`, {
      method: 'PATCH',
      body: JSON.stringify({ visible }),
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
    parentCommentId?: string | null,
  ): Promise<DayComment> {
    return apiFetch(`/community/users/${userId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ date, body, parentCommentId: parentCommentId ?? null }),
    })
  },

  async deleteCommunityComment(commentId: string): Promise<void> {
    await apiFetch(`/community/comments/${commentId}`, { method: 'DELETE' })
  },

  async likeCommunityComment(
    commentId: string,
  ): Promise<{ likeCount: number; viewerLiked: boolean }> {
    return apiFetch(`/community/comments/${commentId}/likes`, { method: 'POST' })
  },

  async unlikeCommunityComment(
    commentId: string,
  ): Promise<{ likeCount: number; viewerLiked: boolean }> {
    return apiFetch(`/community/comments/${commentId}/likes`, { method: 'DELETE' })
  },

  async getCommunityUserMonth(
    userId: string,
    year: number,
    month: number,
  ): Promise<{
    member: Pick<CommunityMember, 'id' | 'nickname' | 'isSelf' | 'avatarUrl'>
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

  async listWeeklyReports(): Promise<{ reports: WeeklyReportSummary[] }> {
    return apiFetch('/telemetry/weekly-reports')
  },

  async getWeeklyReport(weekId: string): Promise<WeeklyReportDetail> {
    return apiFetch(`/telemetry/weekly-reports/${encodeURIComponent(weekId)}`)
  },

  async regenerateWeeklyReport(
    weekId: string,
  ): Promise<{ ok: boolean; weekId?: string; status?: string; ai_ok?: boolean }> {
    return apiFetch(
      `/telemetry/weekly-reports/${encodeURIComponent(weekId)}/regenerate`,
      { method: 'POST' },
    )
  },
}

import { beforeEach, describe, expect, it, vi } from 'vitest'

const queryMock = vi.fn()

vi.mock('../src/db.js', () => ({
  query: (...args) => queryMock(...args),
}))

const {
  buildFoxFallbackMessage,
  calculateFoxCompanionDeficit,
  getCurrentWeekRange,
  getWeeklyChampionSummary,
  sanitizeFoxMessage,
} = await import('../src/foxCompanion.js')

const USER_ID = 'user-1'

const {
  buildFoxFallbackResponse,
  normalizeFoxRequest,
  validateFoxChatResponse,
} = await import('../src/ai/providers/deepseekFox.js')

function profile(overrides = {}) {
  return {
    id: USER_ID,
    onboarding_complete: true,
    bmr: 1500,
    tdee: 2000,
    metabolism_mode: 'full_day',
    deficit_threshold: 500,
    ...overrides,
  }
}

beforeEach(() => {
  queryMock.mockReset()
})

describe('getCurrentWeekRange', () => {
  it('uses Saturday to Friday for the fox companion only', () => {
    const range = getCurrentWeekRange(new Date('2026-06-17T04:00:00Z'))
    expect(range).toEqual({
      today: '2026-06-17',
      weekStart: '2026-06-13',
      weekEnd: '2026-06-19',
    })
  })

  it('keeps Friday in the same fox week', () => {
    const range = getCurrentWeekRange(new Date('2026-06-19T04:00:00Z'))
    expect(range.weekStart).toBe('2026-06-13')
    expect(range.weekEnd).toBe('2026-06-19')
  })

  it('resets the fox week on Saturday', () => {
    const range = getCurrentWeekRange(new Date('2026-06-20T04:00:00Z'))
    expect(range.weekStart).toBe('2026-06-20')
    expect(range.weekEnd).toBe('2026-06-26')
  })
})

describe('getWeeklyChampionSummary', () => {
  it('returns eligible when any log this week reaches champion', async () => {
    queryMock.mockImplementation(async (sql) => {
      if (sql.includes('from profiles')) return { rows: [profile()] }
      if (sql.includes('from day_logs')) {
        return {
          rows: [
            {
              log_date: '2026-06-16',
              exercise_kcal: 650,
              meal_kcal: 1100,
            },
          ],
        }
      }
      return { rows: [] }
    })

    const summary = await getWeeklyChampionSummary(
      USER_ID,
      new Date('2026-06-17T04:00:00Z'),
    )

    expect(summary.eligible).toBe(true)
    expect(summary.championDates).toEqual(['2026-06-16'])
    expect(summary.latestChampionDate).toBe('2026-06-16')
    expect(summary.weekStart).toBe('2026-06-13')
    expect(summary.weekEnd).toBe('2026-06-19')
  })

  it('shows the fox immediately for a current-day champion and drops it if the current day no longer qualifies', async () => {
    queryMock.mockImplementation(async (sql) => {
      if (sql.includes('from profiles')) return { rows: [profile({ bmr: 1500 })] }
      if (sql.includes('from day_logs')) {
        return {
          rows: [
            {
              log_date: '2026-06-23',
              exercise_kcal: 700,
              meal_kcal: 1000,
            },
          ],
        }
      }
      return { rows: [] }
    })

    const currentChampion = await getWeeklyChampionSummary(
      USER_ID,
      new Date('2026-06-23T04:00:00Z'),
    )

    expect(currentChampion.eligible).toBe(true)
    expect(currentChampion.todayChampion).toBe(true)
    expect(currentChampion.historicalChampionDates).toEqual([])
    expect(currentChampion.championDates).toEqual(['2026-06-23'])

    queryMock.mockReset()
    queryMock.mockImplementation(async (sql) => {
      if (sql.includes('from profiles')) return { rows: [profile({ bmr: 1500 })] }
      if (sql.includes('from day_logs')) {
        return {
          rows: [
            {
              log_date: '2026-06-23',
              exercise_kcal: 700,
              meal_kcal: 1500,
            },
          ],
        }
      }
      return { rows: [] }
    })

    const noLongerChampion = await getWeeklyChampionSummary(
      USER_ID,
      new Date('2026-06-23T04:00:00Z'),
    )

    expect(noLongerChampion.eligible).toBe(false)
    expect(noLongerChampion.todayChampion).toBe(false)
    expect(noLongerChampion.championDates).toEqual([])
  })

  it('keeps a past champion day fixed even if today does not qualify', async () => {
    queryMock.mockImplementation(async (sql, params) => {
      if (sql.includes('from profiles')) return { rows: [profile({ bmr: 1500 })] }
      if (sql.includes('from day_logs')) {
        expect(params).toEqual([USER_ID, '2026-06-20', '2026-06-23'])
        return {
          rows: [
            {
              log_date: '2026-06-22',
              exercise_kcal: 700,
              meal_kcal: 1000,
            },
            {
              log_date: '2026-06-23',
              exercise_kcal: 700,
              meal_kcal: 1500,
            },
          ],
        }
      }
      return { rows: [] }
    })

    const summary = await getWeeklyChampionSummary(
      USER_ID,
      new Date('2026-06-23T04:00:00Z'),
    )

    expect(summary.eligible).toBe(true)
    expect(summary.todayChampion).toBe(false)
    expect(summary.historicalChampionDates).toEqual(['2026-06-22'])
    expect(summary.championDates).toEqual(['2026-06-22'])
    expect(summary.latestChampionDate).toBe('2026-06-22')
  })

  it('returns false without onboarding or qualifying logs', async () => {
    queryMock.mockResolvedValueOnce({ rows: [profile({ onboarding_complete: false })] })

    const summary = await getWeeklyChampionSummary(
      USER_ID,
      new Date('2026-06-17T04:00:00Z'),
    )

    expect(summary.eligible).toBe(false)
    expect(summary.todayChampion).toBe(false)
    expect(summary.historicalChampionDates).toEqual([])
    expect(summary.championDates).toEqual([])
  })

  it('uses a full day of metabolism for past fox-week days regardless of server timezone', async () => {
    queryMock.mockImplementation(async (sql) => {
      if (sql.includes('from profiles')) return { rows: [profile({ bmr: 1500 })] }
      if (sql.includes('from day_logs')) {
        return {
          rows: [
            {
              log_date: '2026-06-22',
              exercise_kcal: 1101,
              meal_kcal: 1800,
            },
          ],
        }
      }
      return { rows: [] }
    })

    const summary = await getWeeklyChampionSummary(
      USER_ID,
      new Date('2026-06-23T04:00:00Z'),
    )

    expect(summary.eligible).toBe(true)
    expect(summary.championDates).toEqual(['2026-06-22'])
  })
})

describe('calculateFoxCompanionDeficit', () => {
  it('does not pro-rate historical days through a timezone-sensitive Date', () => {
    expect(
      calculateFoxCompanionDeficit({
        dailyBmr: 1500,
        exerciseKcal: 1101,
        mealKcal: 1800,
        logDate: '2026-06-22',
        today: '2026-06-23',
        metabolismMode: 'time_spread',
        now: new Date('2026-06-23T04:00:00Z'),
      }),
    ).toBe(801)
  })
})

describe('fox message helpers', () => {
  it('sanitizes and truncates generated messages', () => {
    const long = `“${'继续记录'.repeat(40)}”`
    const msg = sanitizeFoxMessage(long, 'fallback')
    expect(Array.from(msg).length).toBe(90)
    expect(msg.startsWith('继续记录')).toBe(true)
  })

  it('uses stable fallback messages', () => {
    expect(buildFoxFallbackMessage('2026-06-16')).toBe(
      buildFoxFallbackMessage('2026-06-16'),
    )
  })
})

describe('structured fox chat', () => {
  it('accepts and clamps a valid structured response', () => {
    const response = validateFoxChatResponse(JSON.stringify({
      text: '漂亮，今日的脚步很稳。',
      mood: 'proud',
      motion: 'praise',
      expression: 'proud',
      bubbleStyle: 'gold',
      duration: 20,
    }))
    expect(response).toMatchObject({ mood: 'proud', duration: 10, fallback: false })
  })

  it('falls back for invalid JSON or enum values', () => {
    const fallback = buildFoxFallbackResponse('evening_not_completed')
    expect(validateFoxChatResponse('not json', fallback)).toEqual(fallback)
    expect(validateFoxChatResponse({
      text: '测试', mood: 'bad', motion: 'idle', expression: 'neutral',
      bubbleStyle: 'warm', duration: 6,
    }, fallback)).toEqual(fallback)
  })

  it('whitelists request context and ignores sensitive fields', () => {
    const request = normalizeFoxRequest({
      trigger: 'fox_long_press_workout_advice',
      password: 'secret',
      user: { displayName: '姐姐', email: 'private@example.com' },
      fitness: { todayExerciseKcal: 320, unknownPrivateValue: 'secret' },
      context: { timeOfDay: 'evening', page: 'settings' },
    })
    expect(request.trigger).toBe('fox_long_press_workout_advice')
    expect(request.user).toEqual({ displayName: '姐姐', locale: undefined })
    expect(request.fitness.todayExerciseKcal).toBe(320)
    expect(request).not.toHaveProperty('password')
    expect(request.context.page).toBe('today')
  })
})

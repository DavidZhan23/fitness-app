import { expect, request, test } from '@playwright/test'
import {
  E2E_PASSWORD,
  E2E_REGISTRATION_KEY,
  uniqueE2eEmail,
} from './helpers/auth'

const apiPort = Number(process.env.PLAYWRIGHT_API_PORT ?? 3101)
const apiUrl = `http://127.0.0.1:${apiPort}`

async function register(api: Awaited<ReturnType<typeof request.newContext>>) {
  const response = await api.post('/auth/register', {
    data: {
      email: uniqueE2eEmail(),
      password: E2E_PASSWORD,
      registration_key: E2E_REGISTRATION_KEY,
    },
  })
  expect(response.ok()).toBe(true)
  return (await response.json()).token as string
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` }
}

test('POST logs cannot attach entries to another user day log', async () => {
  const api = await request.newContext({ baseURL: apiUrl })
  try {
    const [attackerToken, ownerToken] = await Promise.all([
      register(api),
      register(api),
    ])
    const logDate = '2026-08-12'
    const ensured = await api.post('/day-logs/ensure', {
      headers: authHeaders(ownerToken),
      data: { log_date: logDate, tdee_snapshot: 1800 },
    })
    expect(ensured.ok()).toBe(true)
    const ownerDayLog = await ensured.json()

    const exercise = await api.post('/exercises', {
      headers: authHeaders(attackerToken),
      data: { day_log_id: ownerDayLog.id, name: '越权运动', kcal: 500 },
    })
    expect(exercise.status()).toBe(404)
    await expect(exercise.json()).resolves.toEqual({ error: '记录不存在' })

    const meal = await api.post('/meals', {
      headers: authHeaders(attackerToken),
      data: {
        day_log_id: ownerDayLog.id,
        name: '越权饮食',
        kcal: 900,
        protein_g: 30,
        fat_g: 20,
        carbs_g: 100,
        sugar_g: 0,
      },
    })
    expect(meal.status()).toBe(404)
    await expect(meal.json()).resolves.toEqual({ error: '记录不存在' })

    const ownerLogAfter = await api.get(`/day-logs/${logDate}`, {
      headers: authHeaders(ownerToken),
    })
    expect(ownerLogAfter.ok()).toBe(true)
    const body = await ownerLogAfter.json()
    expect(Number(body.dayLog.exercise_kcal)).toBe(0)
    expect(Number(body.dayLog.meal_kcal)).toBe(0)
    expect(body.exercises).toEqual([])
    expect(body.meals).toEqual([])
  } finally {
    await api.dispose()
  }
})

test('POST exercises rejects invalid name and calories', async () => {
  const api = await request.newContext({ baseURL: apiUrl })
  try {
    const token = await register(api)
    const logDate = '2026-08-11'
    const ensured = await api.post('/day-logs/ensure', {
      headers: authHeaders(token),
      data: { log_date: logDate, tdee_snapshot: 1800 },
    })
    expect(ensured.ok()).toBe(true)
    const dayLog = await ensured.json()

    for (const data of [
      { day_log_id: dayLog.id, name: '   ', kcal: 100 },
      { day_log_id: dayLog.id, name: '跑步', kcal: 0 },
      { day_log_id: dayLog.id, name: '跑步', kcal: 'not-a-number' },
    ]) {
      const response = await api.post('/exercises', {
        headers: authHeaders(token),
        data,
      })
      expect(response.status()).toBe(400)
      await expect(response.json()).resolves.toEqual({
        error: '请填写名称和有效热量',
      })
    }

    const logAfter = await api.get(`/day-logs/${logDate}`, {
      headers: authHeaders(token),
    })
    expect(logAfter.ok()).toBe(true)
    const body = await logAfter.json()
    expect(Number(body.dayLog.exercise_kcal)).toBe(0)
    expect(body.exercises).toEqual([])
  } finally {
    await api.dispose()
  }
})

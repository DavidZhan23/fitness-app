import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { resolveWritableLogDateFromSearchParams } from '../features/log/submitLog'
import { httpData } from '../lib/api'
import { fetchDayLogWithItems } from '../lib/dayLogService'
import {
  formatDateKey,
  getAccountStartDateKey,
  parseDateKey,
} from '../lib/streaks'
import type { DayLog, Meal } from '../types'

function shiftDateKey(dateKey: string, delta: number): string {
  const date = parseDateKey(dateKey)
  date.setDate(date.getDate() + delta)
  return formatDateKey(date)
}

export function useNutritionDay(pagePath: '/nutrition' | '/micronutrients') {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const today = formatDateKey()
  const dateKey = resolveWritableLogDateFromSearchParams(
    searchParams,
    profile?.created_at,
  )
  const accountStart = getAccountStartDateKey(profile?.created_at)
  const [dayLog, setDayLog] = useState<DayLog | null>(null)
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [micronutrientRetrying, setMicronutrientRetrying] = useState(false)
  const [micronutrientRetryError, setMicronutrientRetryError] = useState('')
  const currentDateRef = useRef(dateKey)
  const mountedRef = useRef(true)
  currentDateRef.current = dateKey

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const fetchDay = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!user || !profile) return null
      const requestedDate = dateKey
      if (!silent) {
        setLoading(true)
        setError('')
        setDayLog(null)
        setMeals([])
      }
      try {
        const result = await fetchDayLogWithItems(user.id, requestedDate, profile)
        if (mountedRef.current && currentDateRef.current === requestedDate) {
          setDayLog(result.dayLog)
          setMeals(result.meals)
        }
        return result
      } catch (err) {
        if (!silent && mountedRef.current && currentDateRef.current === requestedDate) {
          setError(err instanceof Error ? err.message : '加载失败')
        }
        return null
      } finally {
        if (!silent && mountedRef.current && currentDateRef.current === requestedDate) {
          setLoading(false)
        }
      }
    },
    [dateKey, profile, user],
  )

  const loadDay = useCallback(() => fetchDay(), [fetchDay])
  const refreshDay = useCallback(
    () => fetchDay({ silent: true }),
    [fetchDay],
  )

  useEffect(() => {
    setMicronutrientRetryError('')
    void loadDay()
  }, [loadDay])

  useEffect(() => {
    if (dayLog?.micronutrient_status !== 'pending' || !user || !profile) return
    let cancelled = false
    let polling = false
    const poll = async () => {
      if (polling) return
      polling = true
      try {
        const result = await fetchDayLogWithItems(user.id, dateKey, profile)
        if (!cancelled && currentDateRef.current === dateKey) {
          setDayLog(result.dayLog)
          setMeals(result.meals)
        }
      } catch {
        // Keep the pending state visible; a later short poll can recover.
      } finally {
        polling = false
      }
    }
    const timer = window.setInterval(() => void poll(), 1_500)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [dateKey, dayLog?.micronutrient_status, profile, user])

  const retryMicronutrients = useCallback(async () => {
    setMicronutrientRetrying(true)
    setMicronutrientRetryError('')
    const requestedDate = dateKey
    try {
      const refreshed = await httpData.refreshMicronutrients(requestedDate)
      if (mountedRef.current && currentDateRef.current === requestedDate) {
        setDayLog(refreshed)
      }
    } catch (err) {
      if (mountedRef.current && currentDateRef.current === requestedDate) {
        setMicronutrientRetryError(
          err instanceof Error ? err.message : '重试失败，请稍后再试',
        )
      }
    } finally {
      if (mountedRef.current && currentDateRef.current === requestedDate) {
        setMicronutrientRetrying(false)
      }
    }
  }, [dateKey])

  const goToDate = useCallback(
    (next: string) => {
      navigate(
        next === today
          ? pagePath
          : `${pagePath}?date=${encodeURIComponent(next)}`,
      )
    },
    [navigate, pagePath, today],
  )

  return {
    user,
    profile,
    today,
    dateKey,
    accountStart,
    previous: shiftDateKey(dateKey, -1),
    next: shiftDateKey(dateKey, 1),
    dayLog,
    meals,
    loading,
    error,
    loadDay,
    refreshDay,
    goToDate,
    mealLogHref:
      dateKey === today
        ? '/log/meal'
        : `/log/meal?date=${encodeURIComponent(dateKey)}`,
    micronutrientRetrying,
    micronutrientRetryError,
    retryMicronutrients,
  }
}

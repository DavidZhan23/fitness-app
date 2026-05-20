import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PersonalDayStatus } from '../components/CommunityDayStatus'
import { DeficitCard } from '../components/DeficitCard'
import { LogList } from '../components/LogList'
import { useAuth } from '../context/AuthContext'
import {
  deleteExercise,
  deleteMeal,
  fetchDayLogWithItems,
} from '../lib/dayLogService'
import { resolveProfileMetabolism, toKcal } from '../lib/calories'
import {
  calculateSpreadDeficit,
  getAccumulatedMetabolism,
  getMetabolismStatLabel,
} from '../lib/metabolism'
import { displayName } from '../lib/profileDisplay'
import { formatDateKey } from '../lib/streaks'
import type { DayLog, Exercise, Meal } from '../types'

export function TodayPage() {
  const { user, profile } = useAuth()
  const today = formatDateKey()
  const [dayLog, setDayLog] = useState<DayLog | null>(null)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [, tick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  const load = useCallback(async () => {
    if (!user || !profile?.onboarding_complete) return
    setLoading(true)
    setError('')
    try {
      const data = await fetchDayLogWithItems(user.id, today, profile)
      setDayLog(data.dayLog)
      setExercises(data.exercises)
      setMeals(data.meals)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [user, profile, today])

  useEffect(() => {
    load()
  }, [load])

  const handleDeleteExercise = async (id: string) => {
    await deleteExercise(id)
    await load()
  }

  const handleDeleteMeal = async (id: string) => {
    await deleteMeal(id)
    await load()
  }

  const dateLabel = new Date().toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })

  if (loading) {
    return <p className="py-12 text-center text-muted">加载中…</p>
  }

  if (error) {
    return (
      <p className="py-12 text-center text-red-400">
        {error}
        <button type="button" onClick={load} className="ml-2 text-brand underline">
          重试
        </button>
      </p>
    )
  }

  const { bmr: fullDayBmr } = resolveProfileMetabolism(profile)
  const exerciseKcal = toKcal(dayLog?.exercise_kcal)
  const mealKcal = toKcal(dayLog?.meal_kcal)
  const metabolismKcal = getAccumulatedMetabolism(fullDayBmr, today)
  const deficit = calculateSpreadDeficit(
    fullDayBmr,
    exerciseKcal,
    mealKcal,
    today,
  )
  const threshold = toKcal(profile?.deficit_threshold)

  const greeting = displayName(profile, user)

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        你好，<span className="font-medium text-slate-200">{greeting}</span>
      </p>
      <DeficitCard
        dateLabel={dateLabel}
        deficit={deficit}
        metabolismKcal={metabolismKcal}
        metabolismLabel={getMetabolismStatLabel(today, today)}
        exerciseKcal={exerciseKcal}
        mealKcal={mealKcal}
        threshold={threshold}
        fullDayBmr={fullDayBmr}
      />

      <PersonalDayStatus
        deficit={deficit}
        exerciseKcal={exerciseKcal}
        mealKcal={mealKcal}
      />

      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/log/exercise"
          className="rounded-xl bg-teal-900/40 py-3 text-center font-medium ring-1 ring-teal-600/40 hover:bg-teal-900/60"
        >
          + 记运动
        </Link>
        <Link
          to="/log/meal"
          className="rounded-xl bg-amber-900/30 py-3 text-center font-medium ring-1 ring-amber-600/30 hover:bg-amber-900/50"
        >
          + 记饮食
        </Link>
      </div>

      <LogList
        exercises={exercises}
        meals={meals}
        onDeleteExercise={handleDeleteExercise}
        onDeleteMeal={handleDeleteMeal}
      />
    </div>
  )
}

import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { DeficitCard } from '../components/DeficitCard'
import { LogList } from '../components/LogList'
import { useAuth } from '../context/AuthContext'
import {
  deleteExercise,
  deleteMeal,
  fetchDayLogWithItems,
} from '../lib/dayLogService'
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
    return <p className="text-center text-muted py-12">加载中…</p>
  }

  if (error) {
    return (
      <p className="text-center text-red-400 py-12">
        {error}
        <button type="button" onClick={load} className="ml-2 text-brand underline">
          重试
        </button>
      </p>
    )
  }

  const tdee = dayLog?.tdee_snapshot ?? profile?.tdee ?? 0
  const exerciseKcal = dayLog?.exercise_kcal ?? 0
  const mealKcal = dayLog?.meal_kcal ?? 0
  const deficit = dayLog?.deficit ?? tdee
  const threshold = profile?.deficit_threshold ?? 0

  return (
    <div className="space-y-6">
      <DeficitCard
        dateLabel={dateLabel}
        deficit={deficit}
        tdee={tdee}
        exerciseKcal={exerciseKcal}
        mealKcal={mealKcal}
        threshold={threshold}
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

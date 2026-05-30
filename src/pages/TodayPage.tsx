import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { PersonalDayStatus } from '../components/CommunityDayStatus'
import { DeficitCard } from '../components/DeficitCard'
import { HeroGreeting } from '../components/HeroGreeting'
import { LogList } from '../components/LogList'
import { PageShell, StatsGrid } from '../components/ui/responsive'
import { useAuth } from '../context/AuthContext'
import { useAppStyle } from '../context/StyleContext'
import {
  deleteExercise,
  deleteMeal,
  fetchDayLogWithItems,
  updateExercise,
  updateMeal,
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
  const { style } = useAppStyle()
  const profileRef = useRef(profile)
  profileRef.current = profile
  const onboardingComplete = profile?.onboarding_complete
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
    const p = profileRef.current
    if (!user || !p || !onboardingComplete) return
    setLoading(true)
    setError('')
    try {
      const data = await fetchDayLogWithItems(user.id, today, p)
      setDayLog(data.dayLog)
      setExercises(data.exercises)
      setMeals(data.meals)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [user, onboardingComplete, today])

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

  const handleUpdateExercise = async (
    id: string,
    name: string,
    kcal: number,
  ) => {
    await updateExercise(id, name, kcal)
    await load()
  }

  const handleUpdateMeal = async (id: string, name: string, kcal: number) => {
    await updateMeal(id, name, kcal)
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
    <PageShell>
      <div className="today-hero-block">
        <HeroGreeting
          name={greeting}
          themeStyle={style}
          customWelcomeMessage={profile?.welcome_message}
          customWelcomeSubtitle={profile?.welcome_subtitle}
        />
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
      </div>

      <PersonalDayStatus
        deficit={deficit}
        exerciseKcal={exerciseKcal}
        mealKcal={mealKcal}
        dailyBmr={fullDayBmr}
      />

      <StatsGrid columns={2}>
        <Link
          to="/log/exercise"
          className="theme-quick-action theme-quick-action--exercise"
        >
          + 记运动
        </Link>
        <Link
          to="/log/meal"
          className="theme-quick-action theme-quick-action--meal"
        >
          + 记饮食
        </Link>
      </StatsGrid>

      <LogList
        exercises={exercises}
        meals={meals}
        onDeleteExercise={handleDeleteExercise}
        onDeleteMeal={handleDeleteMeal}
        onUpdateExercise={handleUpdateExercise}
        onUpdateMeal={handleUpdateMeal}
      />
    </PageShell>
  )
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { DeficitCard } from '../components/DeficitCard'
import { HeroGreeting } from '../components/HeroGreeting'
import { TodayFeedbackCard } from '../components/TodayFeedbackCard'
import { TodayRecordsSection } from '../components/TodayRecordsSection'
import { UserAvatar } from '../components/UserAvatar'
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
  calculateDeficitByMode,
  getMetabolismByMode,
  getMetabolismStatLabel,
} from '../lib/metabolism'
import { displayName } from '../lib/profileDisplay'
import { formatDateKey } from '../lib/streaks'
import { buildTodayHonors } from '../lib/todayHonors'
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

  const handleBatchDeleteRecords = async (
    exerciseIds: string[],
    mealIds: string[],
  ) => {
    for (const id of exerciseIds) {
      await deleteExercise(id)
    }
    for (const id of mealIds) {
      await deleteMeal(id)
    }
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
  const metabolismMode = profile?.metabolism_mode
  const exerciseKcal = toKcal(dayLog?.exercise_kcal)
  const mealKcal = toKcal(dayLog?.meal_kcal)
  const metabolismKcal = getMetabolismByMode(fullDayBmr, today, metabolismMode)
  const deficit = calculateDeficitByMode(
    fullDayBmr,
    exerciseKcal,
    mealKcal,
    today,
    metabolismMode,
  )
  const threshold = toKcal(profile?.deficit_threshold)

  const greeting = displayName(profile, user)
  const todayHonors = buildTodayHonors({
    deficit,
    exerciseKcal,
    mealKcal,
    dailyBmr: fullDayBmr,
  })

  return (
    <PageShell className="today-page-shell">
      <div className="today-hero-block today-hero-block--compact">
        <div className="today-hero-heading">
          <Link
            to="/settings#body-profile"
            className="today-hero-heading__avatar-link"
            aria-label="进入我的身体资料设置"
          >
            <UserAvatar
              profile={profile}
              user={user}
              size="lg"
              className="today-hero-heading__avatar"
            />
          </Link>
          <HeroGreeting
            name={greeting}
            themeStyle={style}
            customWelcomeMessage={profile?.welcome_message}
            customWelcomeSubtitle={profile?.welcome_subtitle}
          />
        </div>
        <DeficitCard
          dateLabel={dateLabel}
          deficit={deficit}
          metabolismKcal={metabolismKcal}
          metabolismLabel={getMetabolismStatLabel(today, today)}
          exerciseKcal={exerciseKcal}
          mealKcal={mealKcal}
          threshold={threshold}
          fullDayBmr={fullDayBmr}
          showExplanationButton
          showMetabolismDetail
          showClearCalorieResult
          profile={profile}
        />
      </div>

      <StatsGrid columns={2} className="today-action-grid">
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

      <TodayFeedbackCard
        exerciseCount={exercises.length}
        deficit={deficit}
        honors={todayHonors}
      />

      <TodayRecordsSection
        exercises={exercises}
        meals={meals}
        exerciseKcal={exerciseKcal}
        mealKcal={mealKcal}
        onDeleteExercise={handleDeleteExercise}
        onDeleteMeal={handleDeleteMeal}
        onBatchDelete={handleBatchDeleteRecords}
        onUpdateExercise={handleUpdateExercise}
        onUpdateMeal={handleUpdateMeal}
      />

    </PageShell>
  )
}

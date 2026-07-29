import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CalendarDayDetailPanel } from '../components/CalendarDayDetailPanel'
import { DayCommentSection } from '../components/DayCommentSection'
import { DeficitCard } from '../components/DeficitCard'
import { DajiFoxCompanion } from '../components/DajiFoxCompanion'
import { HeroGreeting } from '../components/HeroGreeting'
import { MonthHeatmap, type MonthGridType } from '../components/MonthHeatmap'
import { SplitMonthWall } from '../components/SplitMonthWall'
import { TodayFeedbackCard } from '../components/TodayFeedbackCard'
import { TodayRecordsSection } from '../components/TodayRecordsSection'
import { UserAvatar } from '../components/UserAvatar'
import { PageShell, StatsGrid } from '../components/ui/responsive'
import { useAuth } from '../context/AuthContext'
import { useAppStyle } from '../context/StyleContext'
import {
  httpData,
  type FoxCompanionSummary,
} from '../lib/api'
import {
  getDeficitHeatmapCell,
  getLiveWallLegendHighlight,
  resolveProfileMetabolism,
  toKcal,
} from '../lib/calories'
import { resolveDateFromSearchParams } from '../lib/communityInboxNav'
import { scrollCommunityMainToTop } from '../lib/communityListCache'
import {
  deleteExercise,
  deleteMeal,
  fetchDayLogWithItems,
  updateExercise,
  updateMeal,
} from '../lib/dayLogService'
import {
  calculateDeficitByMode,
  getMetabolismByMode,
  getMetabolismStatLabel,
} from '../lib/metabolism'
import { buildMonthDayMap } from '../lib/monthData'
import {
  formatMonthTitle,
  getMonthRange,
  getTodayMonth,
  shiftMonth,
} from '../lib/monthCalendar'
import { displayName } from '../lib/profileDisplay'
import {
  computeStreak,
  formatDateKey,
  formatDateKeyLabel,
  getAccountStartDateKey,
  getLastNDays,
  isBeforeAccountStart,
  normalizeDateKey,
  parseDateKey,
} from '../lib/streaks'
import { buildTodayHonors } from '../lib/todayHonors'
import type { DayComment, DayLog, Exercise, HeatmapDay, Meal } from '../types'

function resolveViewDate(
  searchParams: URLSearchParams,
  todayKey: string,
  accountStartKey: string | null,
): string {
  const urlDate = resolveDateFromSearchParams(searchParams, null)
  if (!urlDate) return todayKey
  if (urlDate > todayKey) return todayKey
  if (isBeforeAccountStart(urlDate, accountStartKey)) return todayKey
  return urlDate
}

export function TodayPage() {
  const { user, profile } = useAuth()
  const { style } = useAppStyle()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const profileRef = useRef(profile)
  profileRef.current = profile
  const onboardingComplete = profile?.onboarding_complete
  const today = formatDateKey()
  const accountStartKey = getAccountStartDateKey(profile?.created_at)
  const viewDate = resolveViewDate(searchParams, today, accountStartKey)
  const isViewingToday = viewDate === today

  const [dayLog, setDayLog] = useState<DayLog | null>(null)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [meals, setMeals] = useState<Meal[]>([])
  const [comments, setComments] = useState<DayComment[]>([])
  const [foxSummary, setFoxSummary] = useState<FoxCompanionSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [, tick] = useState(0)

  const [wallView, setWallView] = useState(() => {
    const d = parseDateKey(viewDate)
    return { year: d.getFullYear(), month: d.getMonth() + 1 }
  })
  const [dayMap, setDayMap] = useState(() => new Map())
  const [selected, setSelected] = useState<DayLog | null>(null)
  const [detailDateKey, setDetailDateKey] = useState<string | null>(null)
  const [selectedGridType, setSelectedGridType] =
    useState<MonthGridType>('deficit')
  const [wallLoading, setWallLoading] = useState(true)
  const [streakExercise, setStreakExercise] = useState(0)
  const [streakDeficit, setStreakDeficit] = useState(0)
  const [wallPane, setWallPane] = useState<MonthGridType>('exercise')

  const threshold = toKcal(profile?.deficit_threshold)
  const { bmr: profileBmr } = resolveProfileMetabolism(profile)
  const metabolismMode = profile?.metabolism_mode
  const { year, month } = wallView
  const selectedDateKey = detailDateKey
  const isCurrentMonth =
    year === getTodayMonth().year && month === getTodayMonth().month

  useEffect(() => {
    const d = parseDateKey(viewDate)
    setWallView({ year: d.getFullYear(), month: d.getMonth() + 1 })
  }, [viewDate])

  useEffect(() => {
    if (!isViewingToday) return
    const id = setInterval(() => tick((n) => n + 1), 60_000)
    return () => clearInterval(id)
  }, [isViewingToday])

  const loadDay = useCallback(async () => {
    const p = profileRef.current
    if (!user || !p || !onboardingComplete) return
    setLoading(true)
    setError('')
    try {
      const [data, fox, community] = await Promise.all([
        fetchDayLogWithItems(user.id, viewDate, p),
        isViewingToday
          ? httpData.getFoxCompanion().catch(() => null)
          : Promise.resolve(null),
        httpData.getCommunityUser(user.id, viewDate).catch(() => null),
      ])
      setDayLog(data.dayLog)
      setExercises(data.exercises)
      setMeals(data.meals)
      setFoxSummary(fox)
      setComments(community?.comments ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [user, onboardingComplete, viewDate, isViewingToday])

  const loadWall = useCallback(async () => {
    if (!user) return
    setWallLoading(true)
    const { from, to } = getMonthRange(year, month)

    const logs = await httpData.fetchDayLogsRange(from, to)

    setDayMap(
      buildMonthDayMap(
        logs,
        threshold,
        today,
        accountStartKey,
        profileBmr,
        metabolismMode,
      ),
    )

    const streakFrom = getLastNDays(120)[0]
    const streakLogs = await httpData.fetchDayLogsRange(streakFrom, today)

    const streakDays: HeatmapDay[] = getLastNDays(120)
      .filter((d) => d <= today)
      .map((date) => {
        const beforeAccount = isBeforeAccountStart(date, accountStartKey)
        const log = streakLogs.find(
          (l) => normalizeDateKey(String(l.log_date)) === date,
        )
        const exerciseKcal = log ? toKcal(log.exercise_kcal) : 0
        const mealKcal = log ? toKcal(log.meal_kcal) : 0
        const deficit =
          beforeAccount || !log
            ? 0
            : calculateDeficitByMode(
                profileBmr,
                exerciseKcal,
                mealKcal,
                date,
                date === today ? metabolismMode : 'full_day',
                date === today ? new Date() : new Date(`${date}T23:59:59`),
              )
        return {
          date,
          exerciseCheck: exerciseKcal > 0,
          deficitCheck: !beforeAccount && deficit > threshold,
          deficit,
          exerciseKcal,
        }
      })

    setStreakExercise(computeStreak(streakDays, 'exercise'))
    setStreakDeficit(computeStreak(streakDays, 'deficit'))
    setWallLoading(false)
  }, [
    user,
    year,
    month,
    threshold,
    today,
    accountStartKey,
    profileBmr,
    metabolismMode,
  ])

  useEffect(() => {
    void loadDay()
  }, [loadDay])

  useEffect(() => {
    void loadWall()
  }, [loadWall])

  const refreshAfterMutation = useCallback(async () => {
    await loadDay()
    await loadWall()
  }, [loadDay, loadWall])

  const handleDeleteExercise = async (id: string) => {
    await deleteExercise(id)
    await refreshAfterMutation()
  }

  const handleDeleteMeal = async (id: string) => {
    await deleteMeal(id)
    await refreshAfterMutation()
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
    await refreshAfterMutation()
  }

  const handleUpdateExercise = async (
    id: string,
    name: string,
    kcal: number,
  ) => {
    await updateExercise(id, name, kcal)
    await refreshAfterMutation()
  }

  const handleUpdateMeal = async (id: string, name: string, kcal: number) => {
    await updateMeal(id, name, kcal)
    await refreshAfterMutation()
  }

  const closeDetail = useCallback(() => {
    setDetailDateKey(null)
    setSelected(null)
  }, [])

  const handleDayClick = useCallback(
    async (date: string, gridType: MonthGridType = 'deficit') => {
      if (!user) return
      if (isBeforeAccountStart(date, accountStartKey)) return
      if (detailDateKey === date && selectedGridType === gridType) {
        closeDetail()
        return
      }

      setSelectedGridType(gridType)
      setDetailDateKey(date)

      const log = await httpData.fetchDayLogByDate(date)
      setSelected(log)
      if (log) {
        const key = normalizeDateKey(String(log.log_date))
        const refreshed = buildMonthDayMap(
          [log],
          threshold,
          today,
          accountStartKey,
          profileBmr,
          metabolismMode,
        )
        const cell = refreshed.get(key)
        if (cell) {
          setDayMap((prev) => {
            const next = new Map(prev)
            next.set(key, cell)
            return next
          })
        }
      }
    },
    [
      user,
      detailDateKey,
      selectedGridType,
      closeDetail,
      threshold,
      today,
      accountStartKey,
      profileBmr,
      metabolismMode,
    ],
  )

  const goPrev = () => setWallView((v) => shiftMonth(v.year, v.month, -1))
  const goNext = () => {
    const next = shiftMonth(year, month, 1)
    const now = getTodayMonth()
    if (
      next.year > now.year ||
      (next.year === now.year && next.month > now.month)
    ) {
      return
    }
    setWallView(next)
  }
  const goThisMonth = () => setWallView(getTodayMonth())

  const enterDayRecord = useCallback(
    (dateKey: string) => {
      if (!dateKey) return
      closeDetail()
      navigate(`/?date=${encodeURIComponent(dateKey)}`)
      scrollCommunityMainToTop()
    },
    [closeDetail, navigate],
  )

  const dateLabel = useMemo(() => formatDateKeyLabel(viewDate), [viewDate])

  const exerciseLogHref = isViewingToday
    ? '/log/exercise'
    : `/log/exercise?date=${encodeURIComponent(viewDate)}`
  const mealLogHref = isViewingToday
    ? '/log/meal'
    : `/log/meal?date=${encodeURIComponent(viewDate)}`

  if (loading) {
    return <p className="py-12 text-center text-muted">加载中…</p>
  }

  if (error) {
    return (
      <p className="py-12 text-center text-red-400">
        {error}
        <button
          type="button"
          onClick={() => void loadDay()}
          className="ml-2 text-brand underline"
        >
          重试
        </button>
      </p>
    )
  }

  const { bmr: fullDayBmr } = resolveProfileMetabolism(profile)
  const exerciseKcal = toKcal(dayLog?.exercise_kcal)
  const mealKcal = toKcal(dayLog?.meal_kcal)
  const modeForView = isViewingToday ? metabolismMode : 'full_day'
  const nowForView = isViewingToday
    ? new Date()
    : new Date(`${viewDate}T23:59:59`)
  const metabolismKcal = getMetabolismByMode(
    fullDayBmr,
    viewDate,
    modeForView,
    nowForView,
  )
  const deficit = calculateDeficitByMode(
    fullDayBmr,
    exerciseKcal,
    mealKcal,
    viewDate,
    modeForView,
    nowForView,
  )
  const deficitThreshold = toKcal(profile?.deficit_threshold)

  const greeting = displayName(profile, user)
  const todayHonors = buildTodayHonors({
    deficit,
    exerciseKcal,
    mealKcal,
    dailyBmr: fullDayBmr,
  })

  const detailCell = detailDateKey ? dayMap.get(detailDateKey) : undefined
  const detailExerciseKcal =
    detailCell?.exerciseKcal ??
    (selected ? toKcal(selected.exercise_kcal) : 0)
  const detailMealKcal =
    detailCell?.mealKcal ?? (selected ? toKcal(selected.meal_kcal) : 0)

  const selectedDeficit =
    detailDateKey != null
      ? isBeforeAccountStart(detailDateKey, accountStartKey)
        ? 0
        : (detailCell?.deficit ??
          (selected &&
          detailDateKey === normalizeDateKey(String(selected.log_date))
            ? detailDateKey === today
              ? calculateDeficitByMode(
                  profileBmr,
                  toKcal(selected.exercise_kcal),
                  toKcal(selected.meal_kcal),
                  today,
                  metabolismMode,
                )
              : calculateDeficitByMode(
                  profileBmr,
                  toKcal(selected.exercise_kcal),
                  toKcal(selected.meal_kcal),
                  detailDateKey,
                  'full_day',
                  new Date(`${detailDateKey}T23:59:59`),
                )
            : 0))
      : 0

  const selectedBeforeAccount =
    detailDateKey != null &&
    isBeforeAccountStart(detailDateKey, accountStartKey)
  const liveDeficitHeatmap = getDeficitHeatmapCell(
    selectedBeforeAccount ? 0 : selectedDeficit,
    threshold,
  )
  const legendHighlight =
    detailDateKey && (detailCell || selected)
      ? getLiveWallLegendHighlight(
          detailExerciseKcal,
          liveDeficitHeatmap,
          selectedBeforeAccount,
        )
      : null

  const detailOpen = detailDateKey != null

  const heatmapProps = {
    year,
    month,
    dayMap,
    todayKey: today,
    accountStartKey,
    selectedDateKey,
    legendHighlight,
    selectedGridType,
    onDayClick: handleDayClick,
  }

  const detailPanel =
    detailOpen && detailDateKey ? (
      <CalendarDayDetailPanel
        dateKey={detailDateKey}
        gridType={selectedGridType}
        deficit={selectedDeficit}
        exerciseKcal={detailExerciseKcal}
        mealKcal={detailMealKcal}
        dailyBmr={profileBmr}
        onClose={closeDetail}
        onEnterDayRecord={enterDayRecord}
      />
    ) : null

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
        {!isViewingToday && (
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm text-muted">正在查看 {dateLabel}</p>
            <Link to="/" className="text-sm font-medium text-brand">
              回到今天
            </Link>
          </div>
        )}
        <DeficitCard
          dateLabel={dateLabel}
          deficit={deficit}
          metabolismKcal={metabolismKcal}
          metabolismLabel={getMetabolismStatLabel(viewDate, today)}
          exerciseKcal={exerciseKcal}
          mealKcal={mealKcal}
          threshold={deficitThreshold}
          fullDayBmr={fullDayBmr}
          showExplanationButton
          showMetabolismDetail
          showClearCalorieResult
          profile={profile}
        />
      </div>

      <StatsGrid columns={2} className="today-action-grid">
        <Link
          to={exerciseLogHref}
          className="theme-quick-action theme-quick-action--exercise"
        >
          + 记运动
        </Link>
        <Link
          to={mealLogHref}
          className="theme-quick-action theme-quick-action--meal"
        >
          + 记饮食
        </Link>
      </StatsGrid>

      {isViewingToday && (
        <TodayFeedbackCard
          exerciseCount={exercises.length}
          deficit={deficit}
          honors={todayHonors}
        />
      )}

      {isViewingToday && foxSummary && (
        <DajiFoxCompanion
          summary={foxSummary}
          displayName={greeting}
          exerciseKcal={exerciseKcal}
          exerciseCount={exercises.length}
          lastWorkoutType={exercises.at(-1)?.name}
          todayGoalCompleted={todayHonors.some(
            (honor) => honor.key === 'champion',
          )}
        />
      )}

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

      {user && (
        <div id="day-comments" className="scroll-mt-4">
          <DayCommentSection
            key={`${user.id}-${viewDate}-comments`}
            userId={user.id}
            date={viewDate}
            comments={comments}
            onCommentsChange={setComments}
          />
        </div>
      )}

      <StatsGrid columns={2}>
        <StatCard
          label="运动连续"
          value={streakExercise}
          unit="天"
          variant="exercise"
        />
        <StatCard
          label="缺口连续"
          value={streakDeficit}
          unit="天"
          variant="deficit"
        />
      </StatsGrid>

      <section className="surface-card min-w-0 max-w-full p-4">
        <h2 className="mb-4 text-lg font-bold text-primary">打卡墙</h2>
        <div className="mb-4 flex min-w-0 items-center justify-between gap-2">
          <button type="button" onClick={goPrev} className="btn-month-nav">
            ‹ 上月
          </button>
          <div className="text-center">
            <p className="font-semibold text-primary">
              {formatMonthTitle(year, month)}
            </p>
            {!isCurrentMonth && (
              <button
                type="button"
                onClick={goThisMonth}
                className="mt-0.5 text-xs text-brand"
              >
                回到本月
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={goNext}
            disabled={isCurrentMonth}
            className="btn-month-nav"
          >
            下月 ›
          </button>
        </div>

        {wallLoading && dayMap.size === 0 ? (
          <p className="py-8 text-center text-xs text-muted">加载打卡墙…</p>
        ) : (
          <>
            {profile?.wall_style === 'split' ? (
              <SplitMonthWall
                {...heatmapProps}
                wallPane={wallPane}
                onWallPaneChange={setWallPane}
              />
            ) : (
              <MonthHeatmap {...heatmapProps} />
            )}
            {detailPanel}
          </>
        )}
      </section>

      <p className="text-center text-xs text-muted">
        打卡墙样式可在{' '}
        <Link to="/settings" className="text-brand underline">
          设置
        </Link>{' '}
        切换
      </p>
    </PageShell>
  )
}

function StatCard({
  label,
  value,
  unit,
  variant,
}: {
  label: string
  value: number
  unit: string
  variant: 'exercise' | 'deficit'
}) {
  return (
    <div
      className={`calendar-stat-card calendar-stat-card--${variant} px-4 py-3 text-center`}
    >
      <p className="text-xs text-muted">{label}</p>
      <p className="calendar-stat-card__value text-2xl font-bold tabular-nums">
        {value}
        <span className="ml-1 text-sm font-normal text-muted">{unit}</span>
      </p>
    </div>
  )
}

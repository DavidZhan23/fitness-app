import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarDayDetailPanel } from '../components/CalendarDayDetailPanel'
import { MonthHeatmap, type MonthGridType } from '../components/MonthHeatmap'
import { SplitMonthWall } from '../components/SplitMonthWall'
import { PageShell, StatsGrid } from '../components/ui/responsive'
import { useAuth } from '../context/AuthContext'
import { httpData } from '../lib/api'
import { calculateDeficitByMode } from '../lib/metabolism'
import { buildMonthDayMap } from '../lib/monthData'
import {
  formatMonthTitle,
  getMonthRange,
  getTodayMonth,
  shiftMonth,
} from '../lib/monthCalendar'
import {
  computeStreak,
  formatDateKey,
  getAccountStartDateKey,
  getLastNDays,
  isBeforeAccountStart,
  normalizeDateKey,
} from '../lib/streaks'
import {
  getDeficitHeatmapCell,
  getLiveWallLegendHighlight,
  resolveProfileMetabolism,
  toKcal,
} from '../lib/calories'
import type { DayLog, HeatmapDay } from '../types'

export function CalendarPage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const todayKey = formatDateKey()
  const [view, setView] = useState(getTodayMonth)
  const [dayMap, setDayMap] = useState(() => new Map())
  const [selected, setSelected] = useState<DayLog | null>(null)
  const [detailDateKey, setDetailDateKey] = useState<string | null>(null)
  const [selectedGridType, setSelectedGridType] =
    useState<MonthGridType>('deficit')
  const [loading, setLoading] = useState(true)
  const [streakExercise, setStreakExercise] = useState(0)
  const [streakDeficit, setStreakDeficit] = useState(0)
  const [wallPane, setWallPane] = useState<MonthGridType>('exercise')

  const threshold = toKcal(profile?.deficit_threshold)
  const accountStartKey = getAccountStartDateKey(profile?.created_at)
  const { bmr: profileBmr } = resolveProfileMetabolism(profile)
  const metabolismMode = profile?.metabolism_mode
  const { year, month } = view
  const selectedDateKey = detailDateKey
  const isCurrentMonth =
    year === getTodayMonth().year && month === getTodayMonth().month

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { from, to } = getMonthRange(year, month)

    const logs = await httpData.fetchDayLogsRange(from, to)

    setDayMap(
      buildMonthDayMap(
        logs,
        threshold,
        todayKey,
        accountStartKey,
        profileBmr,
        metabolismMode,
      ),
    )

    const streakFrom = getLastNDays(120)[0]
    const streakLogs = await httpData.fetchDayLogsRange(streakFrom, todayKey)

    const streakDays: HeatmapDay[] = getLastNDays(120)
      .filter((d) => d <= todayKey)
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
                date === todayKey ? metabolismMode : 'full_day',
                date === todayKey ? new Date() : new Date(`${date}T23:59:59`),
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

    setLoading(false)
  }, [
    user,
    year,
    month,
    threshold,
    todayKey,
    accountStartKey,
    profileBmr,
    metabolismMode,
  ])

  useEffect(() => {
    load()
  }, [load])

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
          todayKey,
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
      todayKey,
      accountStartKey,
      profileBmr,
      metabolismMode,
    ],
  )

  const goPrev = () => setView((v) => shiftMonth(v.year, v.month, -1))
  const goNext = () => {
    const next = shiftMonth(year, month, 1)
    const now = getTodayMonth()
    if (
      next.year > now.year ||
      (next.year === now.year && next.month > now.month)
    ) {
      return
    }
    setView(next)
  }
  const goToday = () => setView(getTodayMonth())

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
        : detailCell?.deficit ??
          (selected && detailDateKey === normalizeDateKey(String(selected.log_date))
            ? detailDateKey === todayKey
              ? calculateDeficitByMode(
                  profileBmr,
                  toKcal(selected.exercise_kcal),
                  toKcal(selected.meal_kcal),
                  todayKey,
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
            : 0)
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

  if (loading) {
    return <p className="py-12 text-center text-muted">加载中…</p>
  }

  const heatmapProps = {
    year,
    month,
    dayMap,
    todayKey,
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
        onEnterDayRecord={(dateKey) => {
          const communityUserId = user?.id
          if (!communityUserId || !dateKey) return
          closeDetail()
          navigate(
            `/community/${communityUserId}?date=${encodeURIComponent(dateKey)}`,
          )
        }}
      />
    ) : null

  return (
    <PageShell>
      <div>
        <h1 className="text-xl font-bold text-primary">打卡墙</h1>
        <p className="mt-1 text-sm text-muted">
          {/* 每月一图，运动与缺口/盈余颜色越深表示幅度越大（绿=缺口，红=盈余）； */}
        </p>
      </div>

      <StatsGrid columns={2}>
        <StatCard label="运动连续" value={streakExercise} unit="天" variant="exercise" />
        <StatCard label="缺口连续" value={streakDeficit} unit="天" variant="deficit" />
      </StatsGrid>

      <section className="surface-card min-w-0 max-w-full p-4">
        <div className="mb-4 flex min-w-0 items-center justify-between gap-2">
          <button
            type="button"
            onClick={goPrev}
            className="btn-month-nav"
          >
            ‹ 上月
          </button>
          <div className="text-center">
            <p className="font-semibold text-primary">
              {formatMonthTitle(year, month)}
            </p>
            {!isCurrentMonth && (
              <button
                type="button"
                onClick={goToday}
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
      </section>

      <p className="text-center text-xs text-muted">
        打卡墙样式可在{' '}
        <Link to="/settings" className="text-brand underline">
          设置
        </Link>{' '}
        切换
      </p>

      <Link to="/" className="block text-center text-sm text-brand">
        返回今日
      </Link>
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
    <div className={`calendar-stat-card calendar-stat-card--${variant} px-4 py-3 text-center`}>
      <p className="text-xs text-muted">{label}</p>
      <p className="calendar-stat-card__value text-2xl font-bold tabular-nums">
        {value}
        <span className="ml-1 text-sm font-normal text-muted">{unit}</span>
      </p>
    </div>
  )
}

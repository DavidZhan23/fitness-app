import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { MonthHeatmap, type MonthGridType } from '../components/MonthHeatmap'
import { SplitMonthWall } from '../components/SplitMonthWall'
import { WallDayDetailCard } from '../components/WallDayDetailCard'
import { useAuth } from '../context/AuthContext'
import { httpData } from '../lib/api'
import { calculateSpreadDeficit } from '../lib/metabolism'
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
  getCalendarDayDetailBackgroundClass,
  getDeficitHeatmapCell,
  getLiveWallLegendHighlight,
  resolveProfileMetabolism,
  toKcal,
} from '../lib/calories'
import type { DayLog, HeatmapDay } from '../types'

export function CalendarPage() {
  const { user, profile } = useAuth()
  const todayKey = formatDateKey()
  const [view, setView] = useState(getTodayMonth)
  const [dayMap, setDayMap] = useState(() => new Map())
  const [selected, setSelected] = useState<DayLog | null>(null)
  const [loading, setLoading] = useState(true)
  const [streakExercise, setStreakExercise] = useState(0)
  const [streakDeficit, setStreakDeficit] = useState(0)
  const scrollToDetailAfterSelect = useRef(false)
  const [wallPane, setWallPane] = useState<MonthGridType>('exercise')

  const threshold = toKcal(profile?.deficit_threshold)
  const accountStartKey = getAccountStartDateKey(profile?.created_at)
  const { bmr: profileBmr, tdee: profileTdee } = resolveProfileMetabolism(profile)
  const { year, month } = view
  const selectedDateKey = selected
    ? normalizeDateKey(String(selected.log_date))
    : null
  const isCurrentMonth =
    year === getTodayMonth().year && month === getTodayMonth().month

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { from, to } = getMonthRange(year, month)

    const logs = await httpData.fetchDayLogsRange(from, to)

    setDayMap(
      buildMonthDayMap(logs, threshold, todayKey, accountStartKey, profileBmr),
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
        const endOfDay = new Date(`${date}T23:59:59`)
        const deficit =
          beforeAccount || !log
            ? 0
            : date === todayKey
              ? calculateSpreadDeficit(
                  profileBmr,
                  exerciseKcal,
                  mealKcal,
                  date,
                )
              : calculateSpreadDeficit(
                  profileBmr,
                  exerciseKcal,
                  mealKcal,
                  date,
                  endOfDay,
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
  }, [user, year, month, threshold, todayKey, accountStartKey, profileBmr])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!selected || !scrollToDetailAfterSelect.current) return
    scrollToDetailAfterSelect.current = false
    const id = window.setTimeout(() => {
      document
        .getElementById('calendar-day-detail')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
    return () => window.clearTimeout(id)
  }, [selected, selectedDateKey])

  const handleDayClick = async (date: string) => {
    if (!user) return
    if (selectedDateKey === date) {
      setSelected(null)
      return
    }
    scrollToDetailAfterSelect.current = true
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
  }

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
  const selectedDeficit =
    selected && selectedDateKey
      ? isBeforeAccountStart(selectedDateKey, accountStartKey)
        ? 0
        : selectedDateKey === todayKey
          ? calculateSpreadDeficit(
              profileBmr,
              toKcal(selected.exercise_kcal),
              toKcal(selected.meal_kcal),
              todayKey,
            )
          : calculateSpreadDeficit(
              profileBmr,
              toKcal(selected.exercise_kcal),
              toKcal(selected.meal_kcal),
              selectedDateKey,
              new Date(`${selectedDateKey}T23:59:59`),
            )
      : 0

  const selectedBeforeAccount =
    selectedDateKey != null &&
    isBeforeAccountStart(selectedDateKey, accountStartKey)
  const liveDeficitHeatmap = getDeficitHeatmapCell(
    selectedBeforeAccount ? 0 : selectedDeficit,
    threshold,
  )
  const legendHighlight =
    selectedDateKey && selected
      ? getLiveWallLegendHighlight(
          toKcal(selected.exercise_kcal),
          liveDeficitHeatmap,
          selectedBeforeAccount,
        )
      : null
  const detailBgClass =
    selectedDateKey && selected
      ? getCalendarDayDetailBackgroundClass({
          beforeAccount: selectedBeforeAccount,
          splitExercisePane: profile?.wall_style === 'split' && wallPane === 'exercise',
          exerciseKcal: toKcal(selected.exercise_kcal),
          deficitHeatmap: liveDeficitHeatmap,
        })
      : 'heatmap-empty'

  if (loading) {
    return <p className="py-12 text-center text-muted">加载中…</p>
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-primary">打卡墙</h1>
        <p className="mt-1 text-sm text-muted">
          {/* 每月一图，运动与缺口/盈余颜色越深表示幅度越大（绿=缺口，红=盈余）； */}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="运动连续" value={streakExercise} unit="天" variant="exercise" />
        <StatCard label="缺口连续" value={streakDeficit} unit="天" variant="deficit" />
      </div>

      <section className="surface-card p-4">
        <div className="mb-4 flex items-center justify-between gap-2">
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
            year={year}
            month={month}
            dayMap={dayMap}
            todayKey={todayKey}
            accountStartKey={accountStartKey}
            selectedDateKey={selectedDateKey}
            legendHighlight={legendHighlight}
            wallPane={wallPane}
            onWallPaneChange={setWallPane}
            onDayClick={handleDayClick}
          />
        ) : (
          <MonthHeatmap
            year={year}
            month={month}
            dayMap={dayMap}
            todayKey={todayKey}
            accountStartKey={accountStartKey}
            selectedDateKey={selectedDateKey}
            legendHighlight={legendHighlight}
            onDayClick={handleDayClick}
          />
        )}
      </section>

      {selected && (
        <WallDayDetailCard
          dateKey={selectedDateKey ?? todayKey}
          todayKey={todayKey}
          bmr={profileBmr}
          tdee={toKcal(selected.tdee_snapshot) || profileTdee}
          exerciseKcal={toKcal(selected.exercise_kcal)}
          mealKcal={toKcal(selected.meal_kcal)}
          deficit={selectedDeficit}
          dailyBmr={profileBmr}
          detailBgClass={detailBgClass}
          onClose={() => setSelected(null)}
        />
      )}

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
    </div>
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


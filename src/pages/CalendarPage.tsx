import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { PersonalDayStatus } from '../components/CommunityDayStatus'
import { MonthHeatmap } from '../components/MonthHeatmap'
import { SplitMonthWall } from '../components/SplitMonthWall'
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
import { resolveProfileMetabolism, toKcal } from '../lib/calories'
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

  const threshold = toKcal(profile?.deficit_threshold)
  const accountStartKey = getAccountStartDateKey(profile?.created_at)
  const { bmr: profileBmr } = resolveProfileMetabolism(profile)
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

  if (loading) {
    return <p className="py-12 text-center text-muted">加载中…</p>
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">打卡墙</h1>
        <p className="mt-1 text-sm text-muted">
          {/* 每月一图，运动与缺口/盈余颜色越深表示幅度越大（绿=缺口，红=盈余）； */}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="运动连续" value={streakExercise} unit="天" />
        <StatCard label="缺口连续" value={streakDeficit} unit="天" />
      </div>

      <section className="rounded-2xl bg-card p-4 ring-1 ring-slate-700/50">
        <div className="mb-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={goPrev}
            className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-slate-200"
          >
            ‹ 上月
          </button>
          <div className="text-center">
            <p className="font-semibold">{formatMonthTitle(year, month)}</p>
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
            className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-slate-200 disabled:opacity-40"
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
            onDayClick={handleDayClick}
          />
        )}
      </section>

      {selected && (
        <section
          id="calendar-day-detail"
          className="scroll-mt-4 rounded-2xl bg-card p-4 ring-1 ring-slate-700/50"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-medium">
              {selectedDateKey === todayKey ? '今日小结' : '当日小结'}
            </h2>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="rounded-lg px-2 py-1 text-xs text-muted hover:bg-slate-800 hover:text-slate-200"
              aria-label="关闭当日详情"
            >
              关闭
            </button>
          </div>
          <div className="mt-2 grid grid-cols-[minmax(0,1fr)_minmax(7.5rem,9.5rem)] items-start gap-3 sm:grid-cols-[minmax(0,1fr)_220px] sm:gap-4">
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
              <Item
                label="基础代谢 (BMR)"
                value={resolveProfileMetabolism(profile).bmr}
              />
              <Item label="运动消耗" value={toKcal(selected.exercise_kcal)} />
              <Item
                label="全日总消耗 (TDEE)"
                value={
                  toKcal(selected.tdee_snapshot) ||
                  resolveProfileMetabolism(profile).tdee
                }
              />
              <Item label="饮食摄入" value={toKcal(selected.meal_kcal)} />
              <Item label="热量缺口" value={selectedDeficit} highlight />
            </dl>
            {selectedDateKey &&
              !isBeforeAccountStart(selectedDateKey, accountStartKey) && (
              <PersonalDayStatus
                variant="side"
                deficit={selectedDeficit}
                exerciseKcal={toKcal(selected.exercise_kcal)}
                mealKcal={toKcal(selected.meal_kcal)}
                dailyBmr={profileBmr}
              />
            )}
          </div>
          <p className="mt-2 text-xs text-muted">
            基础代谢 (BMR) 按时间逐分钟累计，不是一次性算进全天
          </p>
        </section>
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
}: {
  label: string
  value: number
  unit: string
}) {
  return (
    <div className="rounded-xl bg-card px-4 py-3 text-center ring-1 ring-slate-700/50">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-2xl font-bold tabular-nums text-brand">
        {value}
        <span className="ml-1 text-sm font-normal text-muted">{unit}</span>
      </p>
    </div>
  )
}

function Item({
  label,
  value,
  highlight,
}: {
  label: string
  value: number
  highlight?: boolean
}) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd
        className={`mt-0.5 font-semibold tabular-nums ${
          highlight ? 'text-emerald-400' : ''
        }`}
      >
        {Math.round(value)} kcal
      </dd>
    </div>
  )
}

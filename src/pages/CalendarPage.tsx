import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PersonalDayStatus } from '../components/CommunityDayStatus'
import { MonthHeatmap } from '../components/MonthHeatmap'
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

  const threshold = toKcal(profile?.deficit_threshold)
  const accountStartKey = getAccountStartDateKey(profile?.created_at)
  const { bmr: profileBmr } = resolveProfileMetabolism(profile)
  const { year, month } = view
  const isCurrentMonth =
    year === getTodayMonth().year && month === getTodayMonth().month

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { from, to } = getMonthRange(year, month)

    const logs = await httpData.fetchDayLogsRange(user.id, from, to)

    setDayMap(
      buildMonthDayMap(logs, threshold, todayKey, accountStartKey, profileBmr),
    )

    const streakFrom = getLastNDays(120)[0]
    const streakLogs = await httpData.fetchDayLogsRange(
      user.id,
      streakFrom,
      todayKey,
    )

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

  const handleDayClick = async (date: string) => {
    if (!user) return
    const log = await httpData.fetchDayLogByDate(user.id, date)
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

        <MonthHeatmap
          year={year}
          month={month}
          dayMap={dayMap}
          todayKey={todayKey}
          accountStartKey={accountStartKey}
          onDayClick={handleDayClick}
        />
      </section>

      {selected && (
        <section className="rounded-2xl bg-card p-4 ring-1 ring-slate-700/50">
          <h2 className="font-medium">{selected.log_date}</h2>
          <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <Item
              label="BMR"
              value={resolveProfileMetabolism(profile).bmr}
            />
            <Item
              label="TDEE"
              value={
                toKcal(selected.tdee_snapshot) ||
                resolveProfileMetabolism(profile).tdee
              }
            />
            <Item label="运动" value={toKcal(selected.exercise_kcal)} />
            <Item label="饮食" value={toKcal(selected.meal_kcal)} />
            <Item
              label="缺口"
              value={
                isBeforeAccountStart(
                  normalizeDateKey(String(selected.log_date)),
                  accountStartKey,
                )
                  ? 0
                  : normalizeDateKey(String(selected.log_date)) === todayKey
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
                        normalizeDateKey(String(selected.log_date)),
                        new Date(
                          `${normalizeDateKey(String(selected.log_date))}T23:59:59`,
                        ),
                      )
              }
              highlight
            />
          </dl>
          <p className="mt-2 text-xs text-muted">
            基础代谢按分钟均匀累计，非一次性计入全天
          </p>
          {!isBeforeAccountStart(
            normalizeDateKey(String(selected.log_date)),
            accountStartKey,
          ) && (
            <div className="mt-4">
              <PersonalDayStatus
                deficit={
                  normalizeDateKey(String(selected.log_date)) === todayKey
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
                        normalizeDateKey(String(selected.log_date)),
                        new Date(
                          `${normalizeDateKey(String(selected.log_date))}T23:59:59`,
                        ),
                      )
                }
                exerciseKcal={toKcal(selected.exercise_kcal)}
                mealKcal={toKcal(selected.meal_kcal)}
                dailyBmr={profileBmr}
              />
            </div>
          )}
        </section>
      )}

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
      <dt className="text-muted">{label}</dt>
      <dd
        className={`font-semibold tabular-nums ${
          highlight ? 'text-emerald-400' : ''
        }`}
      >
        {Math.round(value)} kcal
      </dd>
    </div>
  )
}

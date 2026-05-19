import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CommunityDaySummary } from '../components/CommunityDaySummary'
import { MonthHeatmap } from '../components/MonthHeatmap'
import { ReadOnlyLogList } from '../components/ReadOnlyLogList'
import { useAuth } from '../context/AuthContext'
import { httpData } from '../lib/api'
import { buildMonthDayMap } from '../lib/monthData'
import {
  formatMonthTitle,
  getTodayMonth,
  shiftMonth,
} from '../lib/monthCalendar'
import { formatDateKey } from '../lib/streaks'
import type {
  CommunityDaySnapshot,
  CommunityPublicExercise,
  CommunityPublicMeal,
  DayLog,
} from '../types'

export function CommunityUserPage() {
  const { profile } = useAuth()
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const todayKey = formatDateKey()
  const [view, setView] = useState(getTodayMonth)
  const [nickname, setNickname] = useState('')
  const [isSelf, setIsSelf] = useState(false)
  const [viewDate, setViewDate] = useState(todayKey)
  const [snapshot, setSnapshot] = useState<CommunityDaySnapshot | null>(null)
  const [exercises, setExercises] = useState<CommunityPublicExercise[]>([])
  const [meals, setMeals] = useState<CommunityPublicMeal[]>([])
  const [dayMap, setDayMap] = useState(() => new Map())
  const [accountStartKey, setAccountStartKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const { year, month } = view
  const isCurrentMonth =
    year === getTodayMonth().year && month === getTodayMonth().month

  const loadDay = useCallback(
    async (date: string) => {
      if (!userId) return
      const data = await httpData.getCommunityUser(userId, date)
      setNickname(data.member.nickname)
      setIsSelf(data.member.isSelf)
      setSnapshot(data.snapshot)
      setExercises(data.exercises)
      setMeals(data.meals)
      setViewDate(data.date)
    },
    [userId],
  )

  const loadMonth = useCallback(async () => {
    if (!userId) return
    const data = await httpData.getCommunityUserMonth(userId, year, month)
    setNickname(data.member.nickname)
    setIsSelf(data.member.isSelf)
    setAccountStartKey(data.accountStartKey)
    setDayMap(
      buildMonthDayMap(
        data.logs as DayLog[],
        data.threshold,
        todayKey,
        data.accountStartKey,
        data.dailyBmr,
      ),
    )
  }, [userId, year, month, todayKey])

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError('')
    try {
      await Promise.all([loadDay(todayKey), loadMonth()])
    } catch (err) {
      setError(err instanceof Error ? err.message : '无法查看该用户')
    } finally {
      setLoading(false)
    }
  }, [userId, todayKey, loadDay, loadMonth])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!loading && !error) loadMonth()
  }, [year, month, loading, error, loadMonth])

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

  const dateLabel = new Date(viewDate + 'T12:00:00').toLocaleDateString(
    'zh-CN',
    { month: 'long', day: 'numeric', weekday: 'short' },
  )

  if (loading) {
    return <p className="py-12 text-center text-muted">加载中…</p>
  }

  if (error || !snapshot) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-red-400">{error || '用户不存在或未公开'}</p>
        <Link to="/community" className="text-brand underline">
          返回社区
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate('/community')}
          className="text-sm text-muted hover:text-slate-200"
        >
          ← 社区
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-bold ${
            isSelf
              ? 'bg-violet-500/30 text-violet-200 ring-1 ring-violet-400/50'
              : 'bg-slate-700 text-slate-100 ring-1 ring-slate-600'
          }`}
        >
          {nickname.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-bold">{nickname}</h1>
          <p className="text-sm text-muted">
            {isSelf ? '这是你的公开主页' : '公开打卡动态'}
          </p>
        </div>
      </div>

      <CommunityDaySummary
        snapshot={snapshot}
        dateLabel={dateLabel}
        todayKey={todayKey}
        viewerProfile={profile}
        isSelf={isSelf}
      />

      <section>
        <h2 className="mb-2 text-sm font-medium text-slate-200">当日记录</h2>
        <ReadOnlyLogList exercises={exercises} meals={meals} />
      </section>

      <section className="rounded-2xl bg-card p-4 ring-1 ring-slate-700/50">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="font-medium">打卡墙</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={goPrev}
              className="rounded-lg bg-slate-800 px-2.5 py-1 text-sm"
            >
              ‹
            </button>
            <span className="min-w-[5rem] text-center text-sm tabular-nums">
              {formatMonthTitle(year, month)}
            </span>
            <button
              type="button"
              onClick={goNext}
              disabled={isCurrentMonth}
              className="rounded-lg bg-slate-800 px-2.5 py-1 text-sm disabled:opacity-40"
            >
              ›
            </button>
          </div>
        </div>
        <MonthHeatmap
          year={year}
          month={month}
          dayMap={dayMap}
          todayKey={todayKey}
          accountStartKey={accountStartKey}
        />
        <p className="mt-3 text-center text-xs text-muted">
          只读查看，无法修改他人数据
        </p>
      </section>

      {isSelf && (
        <Link
          to="/settings"
          className="block rounded-xl bg-violet-900/30 py-3 text-center text-sm font-medium text-violet-200 ring-1 ring-violet-500/30"
        >
          管理我的公开设置
        </Link>
      )}
    </div>
  )
}

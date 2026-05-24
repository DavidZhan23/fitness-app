import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CommunityDaySummary } from '../components/CommunityDaySummary'
import { CommunityDayStatus } from '../components/CommunityDayStatus'
import { DayCommentSection } from '../components/DayCommentSection'
import { DayLikeButton } from '../components/DayLikeButton'
import { FollowButton } from '../components/FollowButton'
import { MonthHeatmap } from '../components/MonthHeatmap'
import { ReadOnlyLogList } from '../components/ReadOnlyLogList'
import { useAuth } from '../context/AuthContext'
import { useCommunityInbox } from '../hooks/useCommunityInbox'
import { httpData } from '../lib/api'
import {
  loadCommunityListCache,
  loadCommunityUserPreview,
  syncFollowStatusInCommunityListCache,
  syncLikeStatsInCommunityListCache,
} from '../lib/communityListCache'
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
  DayComment,
  DayLog,
} from '../types'

function readInitialUserState(userId: string | undefined) {
  if (!userId) {
    return {
      preview: null as ReturnType<typeof loadCommunityUserPreview>,
      loading: true,
    }
  }
  const preview = loadCommunityUserPreview(userId)
  return { preview, loading: !preview }
}

export function CommunityUserPage() {
  const { profile } = useAuth()
  const { markRead } = useCommunityInbox()
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const todayKey = formatDateKey()
  const initial = readInitialUserState(userId)
  const [view, setView] = useState(getTodayMonth)
  const [nickname, setNickname] = useState(initial.preview?.nickname ?? '')
  const [isSelf, setIsSelf] = useState(initial.preview?.isSelf ?? false)
  const [isFollowing, setIsFollowing] = useState(
    initial.preview?.isFollowing ?? false,
  )
  const [viewDate, setViewDate] = useState(
    initial.preview?.today.date ?? todayKey,
  )
  const [snapshot, setSnapshot] = useState<CommunityDaySnapshot | null>(
    initial.preview?.today ?? null,
  )
  const [exercises, setExercises] = useState<CommunityPublicExercise[]>([])
  const [meals, setMeals] = useState<CommunityPublicMeal[]>([])
  const [likeCount, setLikeCount] = useState(initial.preview?.todayLikeCount ?? 0)
  const [viewerLiked, setViewerLiked] = useState(
    initial.preview?.viewerLikedToday ?? false,
  )
  const [comments, setComments] = useState<DayComment[]>([])
  const [dayMap, setDayMap] = useState(() => new Map())
  const [accountStartKey, setAccountStartKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(initial.loading)
  const [dayLoading, setDayLoading] = useState(false)
  const [monthLoading, setMonthLoading] = useState(false)
  const [error, setError] = useState('')

  const { year, month } = view
  const isCurrentMonth =
    year === getTodayMonth().year && month === getTodayMonth().month

  const applyDayData = useCallback(
    (data: Awaited<ReturnType<typeof httpData.getCommunityUser>>) => {
      setNickname(data.member.nickname)
      setIsSelf(data.member.isSelf)
      setIsFollowing(data.isFollowing)
      setSnapshot(data.snapshot)
      setExercises(data.exercises)
      setMeals(data.meals)
      setViewDate(data.date)
      setLikeCount(data.likeCount)
      setViewerLiked(data.viewerLiked)
      setComments(data.comments)
    },
    [],
  )

  const loadDay = useCallback(
    async (date: string, quiet = false) => {
      if (!userId) return
      if (quiet) setDayLoading(true)
      try {
        const data = await httpData.getCommunityUser(userId, date)
        applyDayData(data)
      } catch (err) {
        if (!quiet) {
          setError(err instanceof Error ? err.message : '无法查看该用户')
        }
      } finally {
        if (quiet) setDayLoading(false)
      }
    },
    [userId, applyDayData],
  )

  const loadMonth = useCallback(async () => {
    if (!userId) return
    setMonthLoading(true)
    try {
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
    } finally {
      setMonthLoading(false)
    }
  }, [userId, year, month, todayKey])

  const load = useCallback(async () => {
    if (!userId) return
    const preview = loadCommunityUserPreview(userId)
    if (!preview) setLoading(true)
    setError('')
    try {
      await loadDay(preview?.today.date ?? todayKey)
    } catch (err) {
      setError(err instanceof Error ? err.message : '无法查看该用户')
    } finally {
      setLoading(false)
    }
  }, [userId, todayKey, loadDay])

  useEffect(() => {
    if (!userId) return
    const preview = loadCommunityUserPreview(userId)
    if (preview) {
      setNickname(preview.nickname)
      setIsSelf(preview.isSelf)
      setIsFollowing(preview.isFollowing)
      setSnapshot(preview.today)
      setViewDate(preview.today.date)
      setLikeCount(preview.todayLikeCount)
      setViewerLiked(preview.viewerLikedToday)
      setLoading(false)
    } else {
      setLoading(true)
    }
    void load()
  }, [userId, load])

  useEffect(() => {
    if (loading || error) return
    void loadMonth()
  }, [year, month, loading, error, loadMonth])

  useEffect(() => {
    if (isSelf) void markRead()
  }, [isSelf, markRead])

  useEffect(() => {
    if (loading || error) return
    if (window.location.hash !== '#day-comments') return
    const id = window.setTimeout(() => {
      document
        .getElementById('day-comments')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
    return () => window.clearTimeout(id)
  }, [loading, error, viewDate])

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

  const handleDayClick = (date: string) => {
    if (date === viewDate) return
    loadDay(date, true)
  }

  const dateLabel = new Date(viewDate + 'T12:00:00').toLocaleDateString(
    'zh-CN',
    { month: 'long', day: 'numeric', weekday: 'short' },
  )

  if (loading && !snapshot) {
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
          onClick={() => navigate(-1)}
          className="text-sm text-muted hover:text-slate-200"
        >
          ← 社区
        </button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl font-bold ${
              isSelf
                ? 'bg-violet-500/30 text-violet-200 ring-1 ring-violet-400/50'
                : 'bg-slate-700 text-slate-100 ring-1 ring-slate-600'
            }`}
          >
            {nickname.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold">{nickname}</h1>
            <p className="text-sm text-muted">
              {isSelf ? '这是你的公开主页' : '公开打卡动态'}
            </p>
          </div>
        </div>
        {!isSelf && (
          <FollowButton
            userId={userId!}
            isFollowing={isFollowing}
            onChange={(following) => {
              setIsFollowing(following)
              const cache = loadCommunityListCache()
              if (!cache || !userId) return
              const activeMembers = cache.members.map((m) =>
                m.id === userId ? { ...m, isFollowing: following } : m,
              )
              const filtered =
                cache.activeFilter === 'following' && !following
                  ? activeMembers.filter((m) => m.id !== userId)
                  : activeMembers
              syncFollowStatusInCommunityListCache(userId, following, {
                activeFilter: cache.activeFilter,
                activeMembers: filtered,
                followingCount: Math.max(
                  0,
                  cache.followingCount + (following ? 1 : -1),
                ),
                scrollY: cache.scrollY,
              })
            }}
          />
        )}
      </div>

      {dayLoading && (
        <p className="text-center text-xs text-muted">加载该日记录…</p>
      )}

      <CommunityDaySummary
        snapshot={snapshot}
        dateLabel={dateLabel}
        todayKey={todayKey}
        viewerProfile={profile}
        isSelf={isSelf}
      />

      <CommunityDayStatus
        snapshot={snapshot}
        viewerProfile={profile}
        isSelf={isSelf}
        variant="full"
      />

      <div className="rounded-2xl bg-card/60 px-4 py-3 ring-1 ring-slate-700/40">
        <DayLikeButton
          key={`${userId}-${viewDate}-like`}
          userId={userId!}
          date={viewDate}
          likeCount={likeCount}
          viewerLiked={viewerLiked}
          disabled={isSelf}
          onChange={(stats) => {
            setLikeCount(stats.likeCount)
            setViewerLiked(stats.viewerLiked)
            if (!userId || viewDate !== todayKey) return
            const cache = loadCommunityListCache()
            if (!cache) return
            const activeMembers = cache.members.map((m) =>
              m.id === userId
                ? {
                    ...m,
                    todayLikeCount: stats.likeCount,
                    viewerLikedToday: stats.viewerLiked,
                  }
                : m,
            )
            syncLikeStatsInCommunityListCache(userId, stats, {
              activeFilter: cache.activeFilter,
              activeMembers,
              followingCount: cache.followingCount,
              scrollY: cache.scrollY,
            })
          }}
        />
      </div>

      <section>
        <h2 className="mb-2 text-sm font-medium text-slate-200">当日记录</h2>
        {!isSelf && (exercises.length > 0 || meals.length > 0) && (
          <p className="mb-2 text-xs text-muted">
            {/* 每条记录右侧可 👍 👎 表态（再次点击取消） */}
          </p>
        )}
        {isSelf && (exercises.length > 0 || meals.length > 0) && (
          <p className="mb-2 text-xs text-muted">
            {/* 右侧为健友对你每条记录的 👍 👎 人数 */}
          </p>
        )}
        <ReadOnlyLogList
          exercises={exercises}
          meals={meals}
          targetUserId={userId}
          canReact={!isSelf}
          showReactionStats={isSelf}
          onExerciseReactionChange={(id, stats) =>
            setExercises((prev) =>
              prev.map((e) => (e.id === id ? { ...e, ...stats } : e)),
            )
          }
          onMealReactionChange={(id, stats) =>
            setMeals((prev) =>
              prev.map((m) => (m.id === id ? { ...m, ...stats } : m)),
            )
          }
        />
      </section>

      <div id="day-comments" className="scroll-mt-4">
        <DayCommentSection
          key={`${userId}-${viewDate}-comments`}
          userId={userId!}
          date={viewDate}
          comments={comments}
          onCommentsChange={setComments}
        />
      </div>

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
        {monthLoading && dayMap.size === 0 ? (
          <p className="py-8 text-center text-xs text-muted">加载打卡墙…</p>
        ) : (
          <>
            <MonthHeatmap
              year={year}
              month={month}
              dayMap={dayMap}
              todayKey={todayKey}
              accountStartKey={accountStartKey}
              selectedDateKey={viewDate}
              onDayClick={handleDayClick}
            />
            <p className="mt-3 text-center text-xs text-muted">
              点击日期查看该日记录与评论
            </p>
          </>
        )}
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

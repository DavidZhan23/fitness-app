import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CommunityDaySummary } from '../components/CommunityDaySummary'
import { CommunityDayStatus } from '../components/CommunityDayStatus'
import { DayBadgePopover } from '../components/DayBadgePopover'
import { DayCommentSection } from '../components/DayCommentSection'
import { FollowButton } from '../components/FollowButton'
import { UserAvatar } from '../components/UserAvatar'
import { MonthHeatmap, type MonthGridType } from '../components/MonthHeatmap'
import { SplitMonthWall } from '../components/SplitMonthWall'
import { ReadOnlyLogList } from '../components/ReadOnlyLogList'
import { useAuth } from '../context/AuthContext'
import { useCommunityInbox } from '../hooks/useCommunityInbox'
import { httpData } from '../lib/api'
import {
  loadCommunityListCache,
  loadCommunityUserPreview,
  syncFollowStatusInCommunityListCache,
} from '../lib/communityListCache'
import { buildMonthDayMap } from '../lib/monthData'
import {
  formatMonthTitle,
  getTodayMonth,
  shiftMonth,
} from '../lib/monthCalendar'
import { getWallLegendHighlight } from '../lib/calories'
import { formatDateKey, isBeforeAccountStart } from '../lib/streaks'
import type {
  CommunityDaySnapshot,
  CommunityPublicExercise,
  CommunityPublicMeal,
  DayComment,
  DayLog,
  WallStyle,
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

function resolveWallStyle(
  isSelf: boolean,
  memberWallStyle: WallStyle | undefined,
  viewerWallStyle: WallStyle | undefined,
): WallStyle {
  if (isSelf) {
    return viewerWallStyle === 'split' ? 'split' : 'classic'
  }
  return memberWallStyle === 'split' ? 'split' : 'classic'
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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [isSelf, setIsSelf] = useState(initial.preview?.isSelf ?? false)
  const [isFollowing, setIsFollowing] = useState(
    initial.preview?.isFollowing ?? false,
  )
  const [memberWallStyle, setMemberWallStyle] = useState<WallStyle | undefined>(
    undefined,
  )
  const [viewDate, setViewDate] = useState(
    initial.preview?.today.date ?? todayKey,
  )
  const [snapshot, setSnapshot] = useState<CommunityDaySnapshot | null>(
    initial.preview?.today ?? null,
  )
  const [exercises, setExercises] = useState<CommunityPublicExercise[]>([])
  const [meals, setMeals] = useState<CommunityPublicMeal[]>([])
  const [comments, setComments] = useState<DayComment[]>([])
  const [dayMap, setDayMap] = useState(() => new Map())
  const [accountStartKey, setAccountStartKey] = useState<string | null>(null)
  const [ownerDailyBmr, setOwnerDailyBmr] = useState(0)
  const [monthThreshold, setMonthThreshold] = useState(0)
  const [loading, setLoading] = useState(initial.loading)
  const [dayLoading, setDayLoading] = useState(false)
  const [monthLoading, setMonthLoading] = useState(false)
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [anchorGrid, setAnchorGrid] = useState<MonthGridType>('deficit')
  const [popoverActive, setPopoverActive] = useState(false)
  const [wallPane, setWallPane] = useState<'exercise' | 'deficit'>('exercise')
  const [error, setError] = useState('')

  const { year, month } = view
  const isCurrentMonth =
    year === getTodayMonth().year && month === getTodayMonth().month

  const applyDayData = useCallback(
    (data: Awaited<ReturnType<typeof httpData.getCommunityUser>>) => {
      setNickname(data.member.nickname)
      setAvatarUrl(data.member.avatarUrl ?? null)
      setIsSelf(data.member.isSelf)
      setIsFollowing(data.isFollowing)
      setMemberWallStyle(data.member.wallStyle)
      setSnapshot(data.snapshot)
      setExercises(data.exercises)
      setMeals(data.meals)
      setViewDate(data.date)
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
      setAvatarUrl(data.member.avatarUrl ?? null)
      setIsSelf(data.member.isSelf)
      setMemberWallStyle(data.member.wallStyle)
      setAccountStartKey(data.accountStartKey)
      setOwnerDailyBmr(data.dailyBmr)
      setMonthThreshold(data.threshold)
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
    setPopoverActive(false)
  }, [year, month])

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

  const handleSelectedCellAnchorChange = useCallback(
    (el: HTMLElement | null, _gridType: MonthGridType) => {
      setAnchorEl(el)
    },
    [],
  )

  const handleDayClick = useCallback(
    (date: string, gridType: MonthGridType = 'deficit') => {
      if (viewDate === date && anchorGrid === gridType && popoverActive) {
        setPopoverActive(false)
        return
      }

      setAnchorGrid(gridType)
      setPopoverActive(true)
      if (viewDate !== date) {
        setViewDate(date)
        void loadDay(date, true)
      }
    },
    [viewDate, anchorGrid, popoverActive, loadDay],
  )

  const closePopover = useCallback(() => {
    setPopoverActive(false)
  }, [])

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

  const legendHighlight = getWallLegendHighlight(
    dayMap.get(viewDate),
    isBeforeAccountStart(viewDate, accountStartKey),
  )
  const wallStyle = resolveWallStyle(
    isSelf,
    memberWallStyle,
    profile?.wall_style,
  )

  const selectedCell = dayMap.get(viewDate)
  const popoverFromSnapshot =
    snapshot && !selectedCell && snapshot.date === viewDate ? snapshot : null
  const popoverOpen = Boolean(
    popoverActive &&
      anchorEl &&
      viewDate &&
      (selectedCell || popoverFromSnapshot),
  )
  const popoverBmr = ownerDailyBmr || snapshot?.dailyBmr || 0
  const popoverThreshold = monthThreshold || snapshot?.threshold || 0
  const popoverDeficit =
    selectedCell?.deficit ?? popoverFromSnapshot?.deficit ?? 0
  const popoverExerciseKcal =
    selectedCell?.exerciseKcal ?? popoverFromSnapshot?.exerciseKcal ?? 0
  const popoverMealKcal =
    selectedCell?.mealKcal ?? popoverFromSnapshot?.mealKcal ?? 0

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

  const heatmapProps = {
    year,
    month,
    dayMap,
    todayKey,
    accountStartKey,
    selectedDateKey: viewDate,
    legendHighlight,
    anchorGrid,
    onSelectedCellAnchorChange: handleSelectedCellAnchorChange,
    onDayClick: handleDayClick,
    honorsOnly: !isSelf,
  }

  return (
    <div className="space-y-5 pb-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-sm text-secondary hover:text-primary"
        >
          ← 社区
        </button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar
            variant="community"
            size="lg"
            nickname={nickname}
            avatarUrl={avatarUrl}
            isSelf={isSelf}
          />
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-primary">{nickname}</h1>
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

      <section>
        <h2 className="mb-2 text-sm font-medium text-primary">当日记录</h2>
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

      <section className="surface-card rounded-2xl p-4">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="font-medium text-primary">打卡墙</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={goPrev}
              className="btn-month-nav px-2.5 py-1"
            >
              ‹
            </button>
            <span className="min-w-[5rem] text-center text-sm tabular-nums text-primary">
              {formatMonthTitle(year, month)}
            </span>
            <button
              type="button"
              onClick={goNext}
              disabled={isCurrentMonth}
              className="btn-month-nav px-2.5 py-1"
            >
              ›
            </button>
          </div>
        </div>
        {monthLoading && dayMap.size === 0 ? (
          <p className="py-8 text-center text-xs text-muted">加载打卡墙…</p>
        ) : (
          <>
            {wallStyle === 'split' ? (
              <SplitMonthWall
                {...heatmapProps}
                wallPane={wallPane}
                onWallPaneChange={setWallPane}
              />
            ) : (
              <MonthHeatmap {...heatmapProps} />
            )}
            <p className="mt-3 text-center text-xs text-muted">
              点击格子查看当日称号与数据
            </p>
          </>
        )}
      </section>

      <DayBadgePopover
        open={popoverOpen}
        anchorEl={anchorEl}
        anchorGrid={anchorGrid}
        dateKey={viewDate}
        todayKey={todayKey}
        deficit={popoverDeficit}
        exerciseKcal={popoverExerciseKcal}
        mealKcal={popoverMealKcal}
        bmr={popoverBmr}
        tdee={popoverBmr + popoverExerciseKcal}
        deficitThreshold={popoverThreshold}
        honorsOnly={!isSelf}
        onClose={closePopover}
      />

      {isSelf && (
        <Link
          to="/settings"
          className="surface-card block rounded-xl py-3 text-center text-sm font-medium text-brand"
        >
          管理我的公开设置
        </Link>
      )}
    </div>
  )
}

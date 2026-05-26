import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CommunityMemberList } from '../components/CommunityMemberList'
import {
  CommunitySegment,
  type CommunityFilter,
} from '../components/CommunitySegment'
import { CommunityInboxHint } from '../components/CommunityInboxHint'
import { useAuth } from '../context/AuthContext'
import { useCommunityInbox } from '../hooks/useCommunityInbox'
import { httpData } from '../lib/api'
import {
  loadCommunityFilterCache,
  loadCommunityListCache,
  getCommunityMainElement,
  restoreCommunityMainScroll,
  saveCommunityListCache,
  syncFollowStatusInCommunityListCache,
  syncLikeStatsInCommunityListCache,
} from '../lib/communityListCache'
import { formatDateKey } from '../lib/streaks'
import type { CommunityInboxSummary, CommunityMember } from '../types'

function readInitialCommunityState() {
  const cached = loadCommunityListCache()
  if (!cached) {
    return {
      fromCache: false as const,
      filter: 'all' as CommunityFilter,
      members: [] as CommunityMember[],
      followingCount: 0,
      scrollY: 0,
    }
  }
  return {
    fromCache: true as const,
    filter: cached.activeFilter,
    members: cached.members,
    followingCount: cached.followingCount,
    scrollY: cached.scrollY,
  }
}

export function CommunityPage() {
  const { user, profile, refreshProfile } = useAuth()
  const { markRead, refresh: refreshInbox } = useCommunityInbox()
  const [inboxHint, setInboxHint] = useState<CommunityInboxSummary | null>(null)
  const [inboxHintDismissed, setInboxHintDismissed] = useState(false)
  const todayKey = formatDateKey()
  const initial = useRef(readInitialCommunityState()).current
  const initialFilter = useRef(initial.filter)
  const scrollYRef = useRef(initial.scrollY)
  const pendingScrollRestore = useRef<number | null>(
    initial.fromCache ? initial.scrollY : null,
  )
  const [filter, setFilter] = useState<CommunityFilter>(initial.filter)
  const [members, setMembers] = useState<CommunityMember[]>(initial.members)
  const [followingCount, setFollowingCount] = useState(initial.followingCount)
  const [loading, setLoading] = useState(!initial.fromCache)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [togglingDayVisible, setTogglingDayVisible] = useState(false)

  const listStateRef = useRef({ filter, members, followingCount })
  listStateRef.current = { filter, members, followingCount }
  const membersRef = useRef(members)
  membersRef.current = members
  const loadGenRef = useRef(0)

  const persistListCache = useCallback(() => {
    saveCommunityListCache({
      activeFilter: listStateRef.current.filter,
      members: listStateRef.current.members,
      followingCount: listStateRef.current.followingCount,
      scrollY: scrollYRef.current,
    })
  }, [])

  const patchSelfDayVisible = useCallback(
    (visible: boolean, list: CommunityMember[]) =>
      list.map((m) =>
        m.isSelf
          ? {
              ...m,
              today: {
                ...m.today,
                dayCommunityVisible: visible,
                hidden: false,
              },
            }
          : m,
      ),
    [],
  )

  const handleDayVisibleChange = useCallback(
    async (visible: boolean) => {
      const prev = membersRef.current
      setTogglingDayVisible(true)
      const optimistic = patchSelfDayVisible(visible, prev)
      setMembers(optimistic)
      listStateRef.current = {
        ...listStateRef.current,
        members: optimistic,
      }
      try {
        await httpData.setDayCommunityVisible(todayKey, visible)
        saveCommunityListCache({
          activeFilter: listStateRef.current.filter,
          members: optimistic,
          followingCount: listStateRef.current.followingCount,
          scrollY: scrollYRef.current,
        })
      } catch (err) {
        setMembers(prev)
        listStateRef.current = {
          ...listStateRef.current,
          members: prev,
        }
        setError(err instanceof Error ? err.message : '更新当日公开状态失败')
      } finally {
        setTogglingDayVisible(false)
      }
    },
    [todayKey, patchSelfDayVisible],
  )

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      const requestFilter = filter
      const gen = ++loadGenRef.current
      const hasMembers = membersRef.current.length > 0
      const blockUi = !opts?.silent && !hasMembers
      if (blockUi) {
        setLoading(true)
        setError('')
      } else {
        setRefreshing(true)
      }
      try {
        const data = await httpData.listCommunityMembers(todayKey, requestFilter)
        if (gen !== loadGenRef.current) return
        setMembers(data.members)
        let nextFollowing = listStateRef.current.followingCount
        if (requestFilter === 'all') {
          nextFollowing = data.members.filter(
            (m) => m.isFollowing && !m.isSelf,
          ).length
          setFollowingCount(nextFollowing)
        }
        saveCommunityListCache({
          activeFilter: requestFilter,
          members: data.members,
          followingCount: nextFollowing,
          scrollY: scrollYRef.current,
        })
      } catch (err) {
        if (gen === loadGenRef.current && blockUi) {
          setError(err instanceof Error ? err.message : '加载失败')
        }
      } finally {
        if (gen === loadGenRef.current) {
          if (blockUi) setLoading(false)
          setRefreshing(false)
        }
      }
    },
    [todayKey, filter],
  )

  /* 滚动时持续记录位置（离开页面前 .app-main 往往已被重置为 0） */
  useEffect(() => {
    const main = getCommunityMainElement()
    if (!main) return
    const onScroll = () => {
      scrollYRef.current = main.scrollTop
    }
    onScroll()
    main.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      main.removeEventListener('scroll', onScroll)
      saveCommunityListCache({
        activeFilter: listStateRef.current.filter,
        members: listStateRef.current.members,
        followingCount: listStateRef.current.followingCount,
        scrollY: scrollYRef.current,
      })
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const summary = await httpData.getCommunityInboxUnread()
        if (!cancelled && summary.count > 0) {
          setInboxHint(summary)
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) {
          await markRead()
          void refreshProfile()
          void refreshInbox()
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [markRead, refreshProfile, refreshInbox])

  const scrollToSelfCard = useCallback(() => {
    document
      .getElementById('community-member-self')
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [])

  const didInitialLoad = useRef(false)
  /* 有缓存时先展示列表并恢复滚动，再静默拉取最新今日数据（成就特效） */
  useEffect(() => {
    if (didInitialLoad.current) return
    didInitialLoad.current = true
    if (initial.fromCache) {
      void load({ silent: true })
    } else {
      void load()
    }
  }, [load, initial.fromCache])

  useEffect(() => {
    if (filter === initialFilter.current) return
    void load()
  }, [filter, load])

  const handleFilterChange = useCallback(
    (next: CommunityFilter) => {
      if (next === filter) return
      loadGenRef.current += 1
      saveCommunityListCache({
        activeFilter: filter,
        members: listStateRef.current.members,
        followingCount: listStateRef.current.followingCount,
        scrollY: scrollYRef.current,
      })
      setFilter(next)
      const cachedMembers = loadCommunityFilterCache(next)
      if (cachedMembers) {
        setMembers(cachedMembers)
        setLoading(false)
        setError('')
      } else {
        setMembers([])
      }
    },
    [filter],
  )

  const prevVisible = useRef(profile?.community_visible)
  useEffect(() => {
    if (prevVisible.current === profile?.community_visible) return
    prevVisible.current = profile?.community_visible
    void load()
  }, [profile?.community_visible, load])

  useLayoutEffect(() => {
    if (pendingScrollRestore.current == null || loading) return
    const y = pendingScrollRestore.current
    pendingScrollRestore.current = null
    restoreCommunityMainScroll(y)
  }, [loading, members.length])

  const handleFollowChange = (userId: string, following: boolean) => {
    const nextFollowingCount = Math.max(
      0,
      listStateRef.current.followingCount + (following ? 1 : -1),
    )
    setMembers((prev) => {
      const next = prev.map((m) =>
        m.id === userId ? { ...m, isFollowing: following } : m,
      )
      const filtered =
        filter === 'following' && !following
          ? next.filter((m) => m.id !== userId)
          : next
      syncFollowStatusInCommunityListCache(userId, following, {
        activeFilter: filter,
        activeMembers: filtered,
        followingCount: nextFollowingCount,
        scrollY: scrollYRef.current,
      })
      return filtered
    })
    setFollowingCount(nextFollowingCount)
  }

  const handleLikeChange = (
    userId: string,
    stats: { likeCount: number; viewerLiked: boolean },
  ) => {
    setMembers((prev) => {
      const next = prev.map((m) =>
        m.id === userId
          ? {
              ...m,
              todayLikeCount: stats.likeCount,
              viewerLikedToday: stats.viewerLiked,
            }
          : m,
      )
      syncLikeStatsInCommunityListCache(userId, stats, {
        activeFilter: filter,
        activeMembers: next,
        followingCount: listStateRef.current.followingCount,
        scrollY: scrollYRef.current,
      })
      return next
    })
  }

  const visible = Boolean(profile?.community_visible)
  const othersCount = members.filter((m) => !m.isSelf).length

  return (
    <div className="space-y-5 pb-2">
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600/20 via-slate-800 to-slate-900 px-4 py-5 ring-1 ring-violet-500/25">
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-500/10 blur-2xl" />
        <h1 className="text-xl font-bold tracking-tight text-violet-200/85">社区</h1>
        <div className="mt-3 space-y-2 text-sm leading-relaxed">
          <div className="space-y-0.5 leading-snug">
            <p className="text-violet-200/85">
              关注健友、每日点赞，在打卡下留言鼓励
            </p>
            <p className="text-violet-200/85">
              按住左侧 ⋮⋮ 可拖动排序；点击名片查看详情
            </p>
          </div>
          <p className="flex flex-nowrap items-center gap-2">
            <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-gradient-to-r from-violet-600/30 to-cyan-600/20 px-2 py-0.5 font-semibold text-violet-100 ring-1 ring-violet-400/35">
              <span aria-hidden>🔥</span>
              减脂先锋
            </span>
            <span
              className="min-w-0 flex-1 truncate text-slate-400"
              title="当日热量缺口≥500kcal，且已记录饮食"
            >
              热量缺口≥500kcal
            </span>
          </p>
          <p className="flex flex-nowrap items-center gap-2">
            <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-gradient-to-r from-amber-600/35 to-orange-600/25 px-2 py-0.5 font-semibold text-amber-100 ring-1 ring-amber-400/40">
              <span aria-hidden>👑</span>
              运动大王
            </span>
            <span
              className="min-w-0 flex-1 truncate text-slate-400"
              title="缺口≥800、运动≥500"
            >
              缺口≥800、运动≥600、饮食≥1k(kcal)
            </span>
          </p>
          <p className="flex flex-nowrap items-center gap-2">
            <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-gradient-to-r from-rose-600/30 to-orange-600/20 px-2 py-0.5 font-semibold text-rose-100 ring-1 ring-rose-400/35">
              <span aria-hidden>🥘</span>
              美食大王
            </span>
            <span
              className="min-w-0 flex-1 truncate text-slate-400"
              title="当日饮食热量 ≥ 基础代谢 × 1.2"
            >
              饮食 ≥ 基础代谢 × 1.2
            </span>
          </p>
        </div>
      </header>

      {inboxHint &&
        !inboxHintDismissed &&
        user &&
        inboxHint.count > 0 && (
          <CommunityInboxHint
            summary={inboxHint}
            selfUserId={user.id}
            onDismiss={() => setInboxHintDismissed(true)}
            onGoToSelfCard={scrollToSelfCard}
          />
        )}

      {!visible && (
        <p className="rounded-xl border border-dashed border-violet-500/30 bg-violet-950/20 px-3 py-2.5 text-sm leading-relaxed text-violet-200/90">
          昨日与今日均未记录运动或饮食时会自动未公开；任一日有记录即可留在社区（今日记一笔后会自动恢复公开）。
        </p>
      )}

      <CommunitySegment
        value={filter}
        refreshing={refreshing}
        followingCount={followingCount}
        onChange={handleFilterChange}
      />

      {loading && members.length === 0 && (
        <p className="py-12 text-center text-muted">加载社区…</p>
      )}

      {error && (
        <p className="py-8 text-center text-red-400">
          {error}
          <button
            type="button"
            onClick={() => void load()}
            className="ml-2 text-brand underline"
          >
            重试
          </button>
        </p>
      )}

      {!loading && !error && members.length === 0 && filter === 'following' && (
        <div className="rounded-2xl border border-dashed border-slate-600 py-12 text-center">
          <p className="text-muted">还没有关注任何人</p>
          <button
            type="button"
            onClick={() => handleFilterChange('all')}
            className="mt-3 text-sm text-violet-300 hover:text-violet-200"
          >
            去发现健友 →
          </button>
        </div>
      )}

      {!loading && !error && members.length === 0 && filter === 'all' && (
        <div className="rounded-2xl border border-dashed border-slate-600 py-12 text-center">
          <p className="text-muted">还没有人公开社区动态</p>
          <p className="mt-1 text-sm text-muted">成为第一个分享的人吧</p>
        </div>
      )}

      {!error && members.length > 0 && (
        <>
          {filter === 'following' && (
            <p className="text-xs text-muted">
              {othersCount > 0
                ? `关注 ${othersCount} 位健友`
                : '目前只有你已公开'}
            </p>
          )}
          <CommunityMemberList
            members={members}
            todayKey={todayKey}
            viewerProfile={profile}
            sortable={filter === 'all'}
            onMembersChange={setMembers}
            onFollowChange={handleFollowChange}
            onLikeChange={handleLikeChange}
            onDayVisibleChange={handleDayVisibleChange}
            togglingDayVisible={togglingDayVisible}
            onBeforeOpenMember={persistListCache}
          />
        </>
      )}

      <Link
        to="/settings"
        className="block text-center text-xs text-muted hover:text-brand"
      >
        在设置中管理昵称与个人资料
      </Link>
    </div>
  )
}

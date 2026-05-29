import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CommunityMemberList } from '../components/CommunityMemberList'
import {
  CommunitySegment,
  type CommunityFilter,
} from '../components/CommunitySegment'
import { DayCommunityVisibleToggle } from '../components/DayCommunityVisibleToggle'
import { useAuth } from '../context/AuthContext'
import { useCommunityInbox } from '../hooks/useCommunityInbox'
import { httpData } from '../lib/api'
import {
  loadCommunityFilterCache,
  loadCommunityListCache,
  getCommunityMainElement,
  restoreCommunityMainScroll,
  patchSelfDayCommunityVisible,
  resolveSelfDayVisible,
  saveCommunityListCache,
  syncFollowStatusInCommunityListCache,
  syncLikeStatsInCommunityListCache,
  syncSelfDayVisibleInCommunityListCache,
} from '../lib/communityListCache'
import { formatDateKey } from '../lib/streaks'
import { PageShell } from '../components/ui/responsive'
import type { CommunityMember } from '../types'

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
    filter:
      (cached.activeFilter as string) === 'followers'
        ? 'all'
        : cached.activeFilter,
    members: cached.members,
    followingCount: cached.followingCount,
    scrollY: cached.scrollY,
  }
}

export function CommunityPage() {
  const { user, profile, refreshProfile } = useAuth()
  const { unreadCount, refresh: refreshInbox } = useCommunityInbox()
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
  const [followerCount, setFollowerCount] = useState(0)
  const [loading, setLoading] = useState(!initial.fromCache)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [togglingDayVisible, setTogglingDayVisible] = useState(false)
  const [selfDayVisible, setSelfDayVisible] = useState(() =>
    resolveSelfDayVisible(initial.members),
  )

  const listStateRef = useRef({ filter, members, followingCount })
  listStateRef.current = { filter, members, followingCount }
  const membersRef = useRef(members)
  membersRef.current = members
  const selfDayVisibleRef = useRef(selfDayVisible)
  selfDayVisibleRef.current = selfDayVisible
  const loadGenRef = useRef(0)

  const persistListCache = useCallback(() => {
    saveCommunityListCache({
      activeFilter: listStateRef.current.filter,
      members: listStateRef.current.members,
      followingCount: listStateRef.current.followingCount,
      scrollY: scrollYRef.current,
    })
  }, [])

  const handleDayVisibleChange = useCallback(
    async (visible: boolean) => {
      loadGenRef.current += 1
      const prev = membersRef.current
      const prevVisible = selfDayVisibleRef.current
      setTogglingDayVisible(true)
      setSelfDayVisible(visible)
      const optimistic = patchSelfDayCommunityVisible(prev, visible)
      setMembers(optimistic)
      listStateRef.current = {
        ...listStateRef.current,
        members: optimistic,
      }
      try {
        const { community_visible: applied } =
          await httpData.setDayCommunityVisible(todayKey, visible)
        setSelfDayVisible(applied)
        const synced = patchSelfDayCommunityVisible(optimistic, applied)
        setMembers(synced)
        listStateRef.current = {
          ...listStateRef.current,
          members: synced,
        }
        syncSelfDayVisibleInCommunityListCache(applied, {
          activeFilter: listStateRef.current.filter,
          activeMembers: synced,
          followingCount: listStateRef.current.followingCount,
          scrollY: scrollYRef.current,
        })
      } catch (err) {
        setSelfDayVisible(prevVisible)
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
    [todayKey],
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
      } else if (!opts?.silent) {
        setRefreshing(true)
      }
      try {
        const data = await httpData.listCommunityMembers(todayKey, requestFilter)
        if (gen !== loadGenRef.current) return
        setMembers(data.members)
        setSelfDayVisible(resolveSelfDayVisible(data.members))
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

  const prefetchFollowerCount = useCallback(async () => {
    try {
      const data = await httpData.listCommunityFollowers()
      setFollowerCount(data.total)
    } catch {
      /* ignore */
    }
  }, [])

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
        await httpData.getCommunityInboxUnread()
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) {
          void refreshProfile()
          void refreshInbox()
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [refreshProfile, refreshInbox])

  const didInitialLoad = useRef(false)
  /* 有缓存时先展示列表并恢复滚动，再静默拉取最新今日数据（成就特效） */
  useEffect(() => {
    if (didInitialLoad.current) return
    didInitialLoad.current = true
    void prefetchFollowerCount()
    if (initial.fromCache) {
      void load({ silent: true })
    } else {
      void load()
    }
  }, [load, initial.fromCache, prefetchFollowerCount])

  useEffect(() => {
    if (filter === initialFilter.current) return
    void load({ silent: true })
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
        setMembers(
          patchSelfDayCommunityVisible(
            cachedMembers,
            selfDayVisibleRef.current,
          ),
        )
        setLoading(false)
        setError('')
      } else {
        setMembers([])
        void load({ silent: false })
      }
    },
    [filter, load],
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
    stats: {
      likeCount: number
      dislikeCount: number
      viewerLiked: boolean
      viewerDisliked: boolean
    },
  ) => {
    setMembers((prev) => {
      const next = prev.map((m) =>
        m.id === userId
          ? {
              ...m,
              todayLikeCount: stats.likeCount,
              todayDislikeCount: stats.dislikeCount,
              viewerLikedToday: stats.viewerLiked,
              viewerDislikedToday: stats.viewerDisliked,
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
  const listLoading = loading && members.length === 0

  return (
    <PageShell className="pb-2">
      <header className="community-hero community-hero--compact relative overflow-hidden px-4">
        <div className="relative flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold tracking-tight text-primary">社区</h1>
          {user && (
            <DayCommunityVisibleToggle
              visible={selfDayVisible}
              saving={togglingDayVisible}
              onToggle={() =>
                void handleDayVisibleChange(!selfDayVisibleRef.current)
              }
            />
          )}
        </div>
        <nav className="community-hub-row" aria-label="社区快捷入口">
          <Link
            to="/community/inbox"
            className="community-hub-link"
            aria-label={
              unreadCount > 0
                ? `查看互动消息，${unreadCount > 99 ? '99+' : unreadCount} 条未读`
                : '查看互动消息'
            }
          >
            <span>互动消息</span>
            {unreadCount > 0 && (
              <span className="community-hub-count">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>
          <span className="community-hub-sep" aria-hidden>
            ·
          </span>
          <Link
            to="/community/followers"
            className="community-hub-link"
            aria-label={
              followerCount > 0
                ? `查看新增关注，${followerCount > 99 ? '99+' : followerCount} 人`
                : '查看新增关注'
            }
          >
            <span>新增关注</span>
            {followerCount > 0 && (
              <span className="community-hub-count">
                {followerCount > 99 ? '99+' : followerCount}
              </span>
            )}
          </Link>
        </nav>
        <p className="community-hero-rules-hint">
          按住左侧 ⋮⋮ 可拖动排序；点击名片查看详情
        </p>
      </header>

      <section
        className="community-title-rules px-4 py-2.5"
        aria-label="称号规则"
      >
        <div className="space-y-2 leading-relaxed">
          <p className="flex flex-nowrap items-center gap-2">
            <span className="community-pill community-pill--elite inline-flex shrink-0 items-center gap-1">
              <span aria-hidden>🔥</span>
              减脂先锋
            </span>
            <span
              className="community-title-rules__desc min-w-0 flex-1 truncate"
              title="当日热量缺口≥500kcal，且已记录饮食"
            >
              热量缺口≥500kcal
            </span>
          </p>
          <p className="flex flex-nowrap items-center gap-2">
            <span className="community-pill community-pill--champion inline-flex shrink-0 items-center gap-1">
              <span aria-hidden>👑</span>
              运动大王
            </span>
            <span
              className="community-title-rules__desc min-w-0 flex-1 truncate"
              title="缺口≥800、运动≥500"
            >
              缺口≥800、运动≥600、饮食≥1k(kcal)
            </span>
          </p>
          <p className="flex flex-nowrap items-center gap-2">
            <span className="community-pill community-pill--foodKing inline-flex shrink-0 items-center gap-1">
              <span aria-hidden>🥘</span>
              美食大王
            </span>
            <span
              className="community-title-rules__desc min-w-0 flex-1 truncate"
              title="当日饮食热量 ≥ 基础代谢 × 1.2"
            >
              饮食 ≥ 基础代谢 × 1.2
            </span>
          </p>
        </div>
      </section>

      {!visible && (
        <p className="community-visibility-hint">
          完成资料设置后会在社区公开；记录运动/饮食可保持活跃状态。
        </p>
      )}

      <CommunitySegment
        value={filter}
        refreshing={refreshing}
        followingCount={followingCount}
        onChange={handleFilterChange}
      />

      {listLoading && (
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

      {!listLoading && !error && members.length === 0 && filter === 'following' && (
        <div className="community-empty">
          <p className="community-empty__title">还没有关注任何人</p>
          <button
            type="button"
            onClick={() => handleFilterChange('all')}
            className="community-empty__action"
          >
            去发现健友 →
          </button>
        </div>
      )}

      {!listLoading && !error && members.length === 0 && filter === 'all' && (
        <div className="community-empty">
          <p className="community-empty__title">还没有人公开社区动态</p>
          <p className="community-empty__desc">成为第一个分享的人吧</p>
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
    </PageShell>
  )
}

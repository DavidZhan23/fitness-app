import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CommunityMemberList } from '../components/CommunityMemberList'
import {
  CommunitySegment,
  type CommunityFilter,
} from '../components/CommunitySegment'
import { CommunityShareToggle } from '../components/CommunityShareToggle'
import { useAuth } from '../context/AuthContext'
import { useCommunityInbox } from '../hooks/useCommunityInbox'
import { httpData } from '../lib/api'
import {
  loadCommunityListCache,
  getCommunityMainElement,
  restoreCommunityMainScroll,
  saveCommunityListCache,
} from '../lib/communityListCache'
import { formatDateKey } from '../lib/streaks'
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
    filter: cached.filter,
    members: cached.members,
    followingCount: cached.followingCount,
    scrollY: cached.scrollY,
  }
}

export function CommunityPage() {
  const { profile, refreshProfile } = useAuth()
  const { markRead } = useCommunityInbox()
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
  const [error, setError] = useState('')

  const listStateRef = useRef({ filter, members, followingCount })
  listStateRef.current = { filter, members, followingCount }

  const persistListCache = useCallback(() => {
    saveCommunityListCache({
      ...listStateRef.current,
      scrollY: scrollYRef.current,
    })
  }, [])

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) {
        setLoading(true)
        setError('')
      }
      try {
        const data = await httpData.listCommunityMembers(todayKey, filter)
        setMembers(data.members)
        let nextFollowing = listStateRef.current.followingCount
        if (filter === 'all') {
          nextFollowing = data.members.filter(
            (m) => m.isFollowing && !m.isSelf,
          ).length
          setFollowingCount(nextFollowing)
        }
        saveCommunityListCache({
          filter,
          members: data.members,
          followingCount: nextFollowing,
          scrollY: scrollYRef.current,
        })
      } catch (err) {
        if (!opts?.silent) {
          setError(err instanceof Error ? err.message : '加载失败')
        }
      } finally {
        if (!opts?.silent) setLoading(false)
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
        ...listStateRef.current,
        scrollY: scrollYRef.current,
      })
    }
  }, [])

  useEffect(() => {
    void markRead()
    void refreshProfile()
  }, [markRead, refreshProfile])

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
    setMembers((prev) => {
      const next = prev.map((m) =>
        m.id === userId ? { ...m, isFollowing: following } : m,
      )
      if (filter === 'following' && !following) {
        return next.filter((m) => m.id !== userId)
      }
      return next
    })
    setFollowingCount((c) => Math.max(0, c + (following ? 1 : -1)))
  }

  const handleLikeChange = (
    userId: string,
    stats: { likeCount: number; viewerLiked: boolean },
  ) => {
    setMembers((prev) =>
      prev.map((m) =>
        m.id === userId
          ? {
              ...m,
              todayLikeCount: stats.likeCount,
              viewerLikedToday: stats.viewerLiked,
            }
          : m,
      ),
    )
  }

  const visible = Boolean(profile?.community_visible)
  const othersCount = members.filter((m) => !m.isSelf).length

  return (
    <div className="space-y-5 pb-2">
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600/20 via-slate-800 to-slate-900 px-4 py-5 ring-1 ring-violet-500/25">
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-500/10 blur-2xl" />
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold tracking-tight text-violet-200/85">社区</h1>
          <CommunityShareToggle compact />
        </div>
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
        </div>
      </header>

      {!visible && (
        <p className="rounded-xl border border-dashed border-violet-500/30 bg-violet-950/20 px-3 py-2.5 text-sm leading-relaxed text-violet-200/90">
          若昨日未记录任何运动或饮食，系统会在今日自动设为未公开；今日仍可正常打卡，记课后可在标题旁重新打开「已公开」。
        </p>
      )}

      <CommunitySegment
        value={filter}
        followingCount={followingCount}
        onChange={setFilter}
      />

      {loading && (
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
            onClick={() => setFilter('all')}
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

      {!loading && !error && members.length > 0 && (
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

      <CommunityShareToggle />

      <Link
        to="/settings"
        className="block text-center text-xs text-muted hover:text-brand"
      >
        在设置中管理昵称与公开选项
      </Link>
    </div>
  )
}

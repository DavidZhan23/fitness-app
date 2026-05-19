import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CommunityMemberCard } from '../components/CommunityMemberCard'
import {
  CommunitySegment,
  type CommunityFilter,
} from '../components/CommunitySegment'
import { CommunityShareToggle } from '../components/CommunityShareToggle'
import { useAuth } from '../context/AuthContext'
import { httpData } from '../lib/api'
import { formatDateKey } from '../lib/streaks'
import type { CommunityMember } from '../types'

export function CommunityPage() {
  const { profile } = useAuth()
  const todayKey = formatDateKey()
  const [filter, setFilter] = useState<CommunityFilter>('all')
  const [members, setMembers] = useState<CommunityMember[]>([])
  const [followingCount, setFollowingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await httpData.listCommunityMembers(todayKey, filter)
      const sorted = [...data.members].sort((a, b) => {
        if (a.isSelf) return -1
        if (b.isSelf) return 1
        return a.nickname.localeCompare(b.nickname, 'zh-CN')
      })
      setMembers(sorted)
      if (filter === 'all') {
        setFollowingCount(
          sorted.filter((m) => m.isFollowing && !m.isSelf).length,
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [todayKey, filter])

  useEffect(() => {
    load()
  }, [load, profile?.community_visible])

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
        <div className="flex flex-nowrap items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight text-slate-50">社区</h1>
            <p className="mt-1 text-sm text-muted leading-snug">
              关注健友、每日点赞，在打卡下留言鼓励
            </p>
          </div>
          <CommunityShareToggle compact />
        </div>
      </header>

      {!visible && (
        <p className="rounded-xl border border-dashed border-violet-500/30 bg-violet-950/20 px-3 py-2.5 text-sm text-violet-200/90">
          你尚未公开动态。打开右上角「未公开」开关后，其他用户才能看到你，你也能留在社区列表中。
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
            onClick={load}
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
          <p className="text-xs text-muted">
            {filter === 'following'
              ? `关注 ${othersCount} 位健友`
              : othersCount > 0
                ? `${othersCount} 位健友已公开 · 点击卡片查看详情`
                : '目前只有你已公开'}
          </p>
          <ul className="space-y-3">
            {members.map((m) => (
              <li key={m.id}>
                <CommunityMemberCard
                  member={m}
                  todayKey={todayKey}
                  viewerProfile={profile}
                  onFollowChange={handleFollowChange}
                  onLikeChange={handleLikeChange}
                />
              </li>
            ))}
          </ul>
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

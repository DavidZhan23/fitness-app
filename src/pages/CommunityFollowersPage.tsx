import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CommunityFollowerList } from '../components/CommunityFollowerList'
import { httpData } from '../lib/api'
import type { CommunityFollower } from '../types'

export function CommunityFollowersPage() {
  const [followers, setFollowers] = useState<CommunityFollower[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await httpData.listCommunityFollowers()
      setFollowers(data.followers)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleFollowChange = useCallback((userId: string, following: boolean) => {
    setFollowers((prev) =>
      prev.map((f) => (f.id === userId ? { ...f, isFollowing: following } : f)),
    )
  }, [])

  return (
    <div className="space-y-3 pb-2">
      <header className="community-inbox-header">
        <div>
          <h1 className="community-inbox-header__title">粉丝</h1>
          <p className="community-inbox-header__desc">最近关注你的人</p>
        </div>
        <Link to="/community" className="community-inbox-back">
          返回社区
        </Link>
      </header>

      {loading ? (
        <p className="py-10 text-center text-sm text-muted">加载中…</p>
      ) : error ? (
        <p className="py-10 text-center text-sm text-danger">
          {error}
          <button
            type="button"
            onClick={() => void load()}
            className="ml-2 text-brand underline"
          >
            重试
          </button>
        </p>
      ) : followers.length === 0 ? (
        <div className="community-empty">
          <p className="community-empty__title">还没有人关注你</p>
          <p className="community-empty__desc">
            去社区看看健友们的今日名片吧
          </p>
          <Link to="/community" className="community-empty__action">
            去社区看看 →
          </Link>
        </div>
      ) : (
        <CommunityFollowerList
          followers={followers}
          onFollowChange={handleFollowChange}
        />
      )}
    </div>
  )
}

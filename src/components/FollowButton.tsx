import { useEffect, useState } from 'react'
import { httpData } from '../lib/api'

interface FollowButtonProps {
  userId: string
  isFollowing: boolean
  onChange?: (following: boolean) => void
  compact?: boolean
}

export function FollowButton({
  userId,
  isFollowing: initialFollowing,
  onChange,
  compact = false,
}: FollowButtonProps) {
  const [following, setFollowing] = useState(initialFollowing)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setFollowing(initialFollowing)
  }, [initialFollowing, userId])

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (busy) return
    setBusy(true)
    const next = !following
    setFollowing(next)
    try {
      if (next) {
        await httpData.followCommunityUser(userId)
      } else {
        await httpData.unfollowCommunityUser(userId)
      }
      onChange?.(next)
    } catch {
      setFollowing(following)
    } finally {
      setBusy(false)
    }
  }

  if (compact) {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={toggle}
        className={`follow-btn follow-btn--compact shrink-0 rounded-full px-2.5 py-1 text-xs font-medium leading-none transition active:scale-95 disabled:opacity-50 ${
          following ? 'follow-btn--following' : 'follow-btn--idle'
        }`}
      >
        {busy ? '…' : following ? '已关注' : '关注'}
      </button>
    )
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={toggle}
      className={`follow-btn rounded-full px-4 py-1.5 text-sm font-medium transition active:scale-95 disabled:opacity-50 ${
        following ? 'follow-btn--following' : 'follow-btn--idle'
      }`}
    >
      {busy ? '…' : following ? '已关注' : '+ 关注'}
    </button>
  )
}

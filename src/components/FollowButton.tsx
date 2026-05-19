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
        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition active:scale-95 disabled:opacity-50 ${
          following
            ? 'bg-violet-950/50 text-violet-200 ring-1 ring-violet-500/40'
            : 'bg-violet-600/80 text-white hover:bg-violet-500'
        }`}
      >
        {busy ? '…' : following ? '已关注' : '+ 关注'}
      </button>
    )
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={toggle}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition active:scale-95 disabled:opacity-50 ${
        following
          ? 'bg-violet-950/50 text-violet-200 ring-1 ring-violet-500/40 hover:bg-violet-900/40'
          : 'bg-violet-600 text-white hover:bg-violet-500'
      }`}
    >
      {busy ? '…' : following ? '已关注' : '+ 关注'}
    </button>
  )
}

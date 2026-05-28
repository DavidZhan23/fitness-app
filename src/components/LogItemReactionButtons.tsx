import { useState } from 'react'
import { httpData } from '../lib/api'
import type { LogItemViewerReaction } from '../types'
import { LikeHeartButton } from './LikeHeartButton'

interface LogItemReactionButtonsProps {
  targetUserId: string
  itemType: 'exercise' | 'meal'
  itemId: string
  thumbsUp: number
  thumbsDown: number
  viewerReaction: LogItemViewerReaction
  onChange: (stats: {
    thumbsUp: number
    thumbsDown: number
    viewerReaction: LogItemViewerReaction
  }) => void
}

export function LogItemReactionButtons({
  targetUserId,
  itemType,
  itemId,
  thumbsUp,
  viewerReaction,
  onChange,
}: LogItemReactionButtonsProps) {
  const [busy, setBusy] = useState(false)

  const toggleLike = async () => {
    if (busy) return
    setBusy(true)
    const requested = viewerReaction === 'up' ? null : 'up'
    try {
      const stats = await httpData.setCommunityLogItemReaction(
        targetUserId,
        itemType,
        itemId,
        requested,
      )
      onChange(stats)
    } catch {
      /* 保持原状 */
    } finally {
      setBusy(false)
    }
  }

  return (
    <LikeHeartButton
      active={viewerReaction === 'up'}
      count={thumbsUp}
      disabled={busy}
      layout="inline"
      size="sm"
      className="log-item-like"
      onClick={() => void toggleLike()}
    />
  )
}

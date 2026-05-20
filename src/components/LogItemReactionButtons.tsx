import { useState } from 'react'
import { httpData } from '../lib/api'
import type { LogItemViewerReaction } from '../types'

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
  thumbsDown,
  viewerReaction,
  onChange,
}: LogItemReactionButtonsProps) {
  const [busy, setBusy] = useState(false)

  const vote = async (next: 'up' | 'down') => {
    if (busy) return
    setBusy(true)
    const requested =
      viewerReaction === next ? null : next
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

  const upActive = viewerReaction === 'up'
  const downActive = viewerReaction === 'down'

  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        disabled={busy}
        aria-label={upActive ? '取消赞' : '赞'}
        aria-pressed={upActive}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          vote('up')
        }}
        className={`flex items-center gap-0.5 rounded-lg px-1.5 py-1 text-base leading-none transition active:scale-95 disabled:opacity-50 ${
          upActive
            ? 'bg-emerald-500/20 ring-1 ring-emerald-400/50'
            : 'hover:bg-slate-700/60'
        }`}
      >
        <span aria-hidden>👍</span>
        {thumbsUp > 0 && (
          <span className="text-[10px] font-medium tabular-nums text-slate-300">
            {thumbsUp}
          </span>
        )}
      </button>
      <button
        type="button"
        disabled={busy}
        aria-label={downActive ? '取消踩' : '踩'}
        aria-pressed={downActive}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          vote('down')
        }}
        className={`flex items-center gap-0.5 rounded-lg px-1.5 py-1 text-base leading-none transition active:scale-95 disabled:opacity-50 ${
          downActive
            ? 'bg-red-500/20 ring-1 ring-red-400/50'
            : 'hover:bg-slate-700/60'
        }`}
      >
        <span aria-hidden>👎</span>
        {thumbsDown > 0 && (
          <span className="text-[10px] font-medium tabular-nums text-slate-300">
            {thumbsDown}
          </span>
        )}
      </button>
    </div>
  )
}

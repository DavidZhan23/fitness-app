import { useEffect, useState } from 'react'
import { httpData } from '../lib/api'

interface DayLikeButtonProps {
  userId: string
  date: string
  likeCount: number
  viewerLiked: boolean
  disabled?: boolean
  onChange?: (stats: { likeCount: number; viewerLiked: boolean }) => void
}

export function DayLikeButton({
  userId,
  date,
  likeCount: initialCount,
  viewerLiked: initialLiked,
  disabled = false,
  onChange,
}: DayLikeButtonProps) {
  const [likeCount, setLikeCount] = useState(initialCount)
  const [viewerLiked, setViewerLiked] = useState(initialLiked)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setLikeCount(initialCount)
    setViewerLiked(initialLiked)
  }, [initialCount, initialLiked, userId, date])

  const toggle = async (e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    if (disabled || busy) return
    setBusy(true)
    const wasLiked = viewerLiked
    const nextLiked = !wasLiked
    const nextCount = likeCount + (nextLiked ? 1 : -1)
    setViewerLiked(nextLiked)
    setLikeCount(Math.max(0, nextCount))
    try {
      const stats = nextLiked
        ? await httpData.likeCommunityDay(userId, date)
        : await httpData.unlikeCommunityDay(userId, date)
      setLikeCount(stats.likeCount)
      setViewerLiked(stats.viewerLiked)
      onChange?.(stats)
    } catch {
      setViewerLiked(wasLiked)
      setLikeCount(likeCount)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={disabled || busy}
        onClick={toggle}
        aria-pressed={viewerLiked}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition active:scale-95 disabled:cursor-default disabled:opacity-60 ${
          viewerLiked
            ? 'bg-rose-500/20 text-rose-300 ring-1 ring-rose-400/40'
            : 'bg-slate-800 text-slate-200 ring-1 ring-slate-600 hover:ring-rose-400/30'
        }`}
      >
        <span
          className={`text-base leading-none transition ${viewerLiked ? 'scale-110' : ''}`}
          aria-hidden
        >
          {viewerLiked ? '♥' : '♡'}
        </span>
        {disabled
          ? `${likeCount} 赞`
          : viewerLiked
            ? '已点赞'
            : '点赞'}
      </button>
      {likeCount > 0 && (
        <span className="text-xs text-muted tabular-nums">
          今日 {likeCount} 人点赞
        </span>
      )}
    </div>
  )
}

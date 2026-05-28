import { useEffect, useState } from 'react'
import { httpData } from '../lib/api'

interface DayLikeButtonProps {
  userId: string
  date: string
  likeCount: number
  viewerLiked: boolean
  disabled?: boolean
  /** 社区列表名片：更小、单行 */
  compact?: boolean
  onChange?: (stats: { likeCount: number; viewerLiked: boolean }) => void
}

export function DayLikeButton({
  userId,
  date,
  likeCount: initialCount,
  viewerLiked: initialLiked,
  disabled = false,
  compact = false,
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

  const label = disabled
    ? `${likeCount} 赞`
    : viewerLiked
      ? compact
        ? '已赞'
        : '已点赞'
      : '点赞'

  if (compact) {
    const compactAriaLabel = disabled
      ? `点赞，当前 ${likeCount} 赞`
      : viewerLiked
        ? `取消点赞，当前 ${likeCount} 赞`
        : `点赞，当前 ${likeCount} 赞`
    return (
      <button
        type="button"
        disabled={disabled || busy}
        onClick={toggle}
        aria-pressed={viewerLiked}
        aria-label={compactAriaLabel}
        className={`day-like-btn day-like-btn--compact day-like-btn--compact-minimal day-like-btn--icon inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-base leading-none transition active:scale-95 disabled:cursor-default disabled:opacity-60 ${
          viewerLiked ? 'day-like-btn--liked' : 'day-like-btn--idle'
        }`}
      >
        <span className={`${viewerLiked ? 'scale-110' : ''}`} aria-hidden>
          ♡
        </span>
      </button>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={disabled || busy}
        onClick={toggle}
        aria-pressed={viewerLiked}
        className={`day-like-btn flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition active:scale-95 disabled:cursor-default disabled:opacity-60 ${
          viewerLiked ? 'day-like-btn--liked' : 'day-like-btn--idle'
        }`}
      >
        <span
          className={`text-base leading-none transition ${viewerLiked ? 'scale-110' : ''}`}
          aria-hidden
        >
          {viewerLiked ? '♥' : '♡'}
        </span>
        {label}
      </button>
      {likeCount > 0 && (
        <span className="text-xs text-muted tabular-nums">
          今日 {likeCount} 人点赞
        </span>
      )}
    </div>
  )
}

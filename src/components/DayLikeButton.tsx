import { useEffect, useState } from 'react'
import { httpData } from '../lib/api'
import { ReactionHeartIcon, ReactionThumbsDownIcon } from './reactionIcons'

interface DayLikeButtonProps {
  userId: string
  date: string
  likeCount: number
  dislikeCount: number
  viewerLiked: boolean
  viewerDisliked: boolean
  disabled?: boolean
  /** 社区列表名片：更小、单行 */
  compact?: boolean
  onChange?: (stats: {
    likeCount: number
    dislikeCount: number
    viewerLiked: boolean
    viewerDisliked: boolean
  }) => void
}

export function DayLikeButton({
  userId,
  date,
  likeCount: initialCount,
  dislikeCount: initialDislikeCount,
  viewerLiked: initialLiked,
  viewerDisliked: initialDisliked,
  disabled = false,
  compact = false,
  onChange,
}: DayLikeButtonProps) {
  const [likeCount, setLikeCount] = useState(initialCount)
  const [dislikeCount, setDislikeCount] = useState(initialDislikeCount)
  const [viewerLiked, setViewerLiked] = useState(initialLiked)
  const [viewerDisliked, setViewerDisliked] = useState(initialDisliked)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setLikeCount(initialCount)
    setDislikeCount(initialDislikeCount)
    setViewerLiked(initialLiked)
    setViewerDisliked(initialDisliked)
  }, [
    initialCount,
    initialDislikeCount,
    initialLiked,
    initialDisliked,
    userId,
    date,
  ])

  const toggleLike = async (e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    if (disabled || busy) return
    setBusy(true)
    const prev = {
      likeCount,
      dislikeCount,
      viewerLiked,
      viewerDisliked,
    }
    const nextLiked = !viewerLiked
    setViewerLiked(nextLiked)
    if (nextLiked) {
      setLikeCount(Math.max(0, likeCount + 1))
      if (viewerDisliked) {
        setViewerDisliked(false)
        setDislikeCount(Math.max(0, dislikeCount - 1))
      }
    } else {
      setLikeCount(Math.max(0, likeCount - 1))
    }
    try {
      const stats = nextLiked
        ? await httpData.likeCommunityDay(userId, date)
        : await httpData.unlikeCommunityDay(userId, date)
      setLikeCount(stats.likeCount)
      setDislikeCount(stats.dislikeCount)
      setViewerLiked(stats.viewerLiked)
      setViewerDisliked(stats.viewerDisliked)
      onChange?.(stats)
    } catch {
      setLikeCount(prev.likeCount)
      setDislikeCount(prev.dislikeCount)
      setViewerLiked(prev.viewerLiked)
      setViewerDisliked(prev.viewerDisliked)
    } finally {
      setBusy(false)
    }
  }

  const toggleDislike = async (e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    if (disabled || busy) return
    setBusy(true)
    const prev = {
      likeCount,
      dislikeCount,
      viewerLiked,
      viewerDisliked,
    }
    const nextDisliked = !viewerDisliked
    setViewerDisliked(nextDisliked)
    if (nextDisliked) {
      setDislikeCount(Math.max(0, dislikeCount + 1))
      if (viewerLiked) {
        setViewerLiked(false)
        setLikeCount(Math.max(0, likeCount - 1))
      }
    } else {
      setDislikeCount(Math.max(0, dislikeCount - 1))
    }
    try {
      const stats = nextDisliked
        ? await httpData.dislikeCommunityDay(userId, date)
        : await httpData.undislikeCommunityDay(userId, date)
      setLikeCount(stats.likeCount)
      setDislikeCount(stats.dislikeCount)
      setViewerLiked(stats.viewerLiked)
      setViewerDisliked(stats.viewerDisliked)
      onChange?.(stats)
    } catch {
      setLikeCount(prev.likeCount)
      setDislikeCount(prev.dislikeCount)
      setViewerLiked(prev.viewerLiked)
      setViewerDisliked(prev.viewerDisliked)
    } finally {
      setBusy(false)
    }
  }

  if (compact) {
    return (
      <div className="day-like-pair day-like-pair--compact">
        <button
          type="button"
          disabled={disabled || busy}
          onClick={toggleLike}
          aria-pressed={viewerLiked}
          aria-label={
            viewerLiked
              ? `取消点赞，当前 ${likeCount} 赞`
              : `点赞，当前 ${likeCount} 赞`
          }
          className={`day-like-btn day-like-btn--compact day-like-btn--compact-minimal inline-flex h-7 items-center gap-0.5 rounded-full px-1.5 text-base leading-none transition active:scale-95 disabled:cursor-default disabled:opacity-60 ${
            viewerLiked ? 'day-like-btn--liked' : 'day-like-btn--idle'
          }`}
        >
          <ReactionHeartIcon
            filled={viewerLiked}
            className={`reaction-icon ${viewerLiked ? 'scale-110' : ''}`}
          />
          {likeCount > 0 && <span className="text-[11px] tabular-nums">{likeCount}</span>}
        </button>
        <button
          type="button"
          disabled={disabled || busy}
          onClick={toggleDislike}
          aria-pressed={viewerDisliked}
          aria-label={
            viewerDisliked
              ? `取消点踩，当前 ${dislikeCount} 踩`
              : `点踩，当前 ${dislikeCount} 踩`
          }
          className={`day-like-btn day-like-btn--compact day-like-btn--compact-minimal inline-flex h-7 items-center gap-0.5 rounded-full px-1.5 text-base leading-none transition active:scale-95 disabled:cursor-default disabled:opacity-60 ${
            viewerDisliked ? 'day-like-btn--disliked' : 'day-like-btn--idle'
          }`}
        >
          <ReactionThumbsDownIcon
            filled={viewerDisliked}
            className={`reaction-icon ${viewerDisliked ? 'scale-110' : ''}`}
          />
          {dislikeCount > 0 && (
            <span className="text-[11px] tabular-nums">{dislikeCount}</span>
          )}
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <div className="day-like-pair">
        <button
          type="button"
          disabled={disabled || busy}
          onClick={toggleLike}
          aria-pressed={viewerLiked}
          className={`day-like-btn flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition active:scale-95 disabled:cursor-default disabled:opacity-60 ${
            viewerLiked ? 'day-like-btn--liked' : 'day-like-btn--idle'
          }`}
        >
          <ReactionHeartIcon
            filled={viewerLiked}
            className={`reaction-icon transition ${viewerLiked ? 'scale-110' : ''}`}
          />
          {viewerLiked ? '已点赞' : '点赞'}
          {likeCount > 0 && <span className="tabular-nums">{likeCount}</span>}
        </button>
        <button
          type="button"
          disabled={disabled || busy}
          onClick={toggleDislike}
          aria-pressed={viewerDisliked}
          className={`day-like-btn flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition active:scale-95 disabled:cursor-default disabled:opacity-60 ${
            viewerDisliked ? 'day-like-btn--disliked' : 'day-like-btn--idle'
          }`}
        >
          <ReactionThumbsDownIcon
            filled={viewerDisliked}
            className={`reaction-icon transition ${viewerDisliked ? 'scale-110' : ''}`}
          />
          {viewerDisliked ? '已踩' : '踩'}
          {dislikeCount > 0 && <span className="tabular-nums">{dislikeCount}</span>}
        </button>
      </div>
      {(likeCount > 0 || dislikeCount > 0) && (
        <span className="text-xs text-muted tabular-nums">
          今日 {likeCount} 赞 / {dislikeCount} 踩
        </span>
      )}
    </div>
  )
}

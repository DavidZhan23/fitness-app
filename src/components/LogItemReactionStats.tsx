interface LogItemReactionStatsProps {
  thumbsUp: number
  thumbsDown: number
}

/** 只读展示他人对你记录的爱心赞人数 */
export function LogItemReactionStats({ thumbsUp }: LogItemReactionStatsProps) {
  if (thumbsUp <= 0) {
    return null
  }

  return (
    <div
      className="log-item-like-stats flex shrink-0 items-center gap-0.5 text-[var(--accent-meal-strong)]"
      title={`${thumbsUp} 人点赞`}
    >
      <svg viewBox="0 0 24 24" width="1rem" height="1rem" aria-hidden>
        <path
          d="M12 21s-6.7-4.35-9.2-7.9C.9 10.2 2.2 6.5 6 5.4c2-.6 4.1.2 6 2.1 1.9-1.9 4-2.7 6-2.1 3.8 1.1 5.1 4.8 3.2 7.7C18.7 16.65 12 21 12 21z"
          fill="currentColor"
        />
      </svg>
      <span className="text-[10px] font-medium tabular-nums">{thumbsUp}</span>
    </div>
  )
}

interface LogItemReactionStatsProps {
  thumbsUp: number
  thumbsDown: number
}

/** 只读展示他人对你记录的 👍 👎 人数 */
export function LogItemReactionStats({
  thumbsUp,
  thumbsDown,
}: LogItemReactionStatsProps) {
  if (thumbsUp <= 0 && thumbsDown <= 0) {
    return (
      <span className="shrink-0 text-[10px] text-muted">暂无人表态</span>
    )
  }

  return (
    <div className="flex shrink-0 items-center gap-2 text-base leading-none">
      <span
        className="flex items-center gap-0.5 text-emerald-400/90"
        title={`${thumbsUp} 人点赞`}
      >
        <span aria-hidden>👍</span>
        <span className="text-[10px] font-medium tabular-nums">{thumbsUp}</span>
      </span>
      <span
        className="flex items-center gap-0.5 text-red-400/90"
        title={`${thumbsDown} 人点踩`}
      >
        <span aria-hidden>👎</span>
        <span className="text-[10px] font-medium tabular-nums">{thumbsDown}</span>
      </span>
    </div>
  )
}

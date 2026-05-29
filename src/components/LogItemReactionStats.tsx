import { ReactionThumbsDownIcon, ReactionThumbsUpIcon } from './reactionIcons'

interface LogItemReactionStatsProps {
  thumbsUp: number
  thumbsDown: number
}

/** 只读展示他人对你记录的赞/踩人数 */
export function LogItemReactionStats({ thumbsUp, thumbsDown }: LogItemReactionStatsProps) {
  if (thumbsUp <= 0 && thumbsDown <= 0) {
    return null
  }

  return (
    <div className="day-like-pair day-like-pair--compact shrink-0">
      {thumbsUp > 0 && (
        <div
          className="log-item-like-stats flex items-center gap-0.5"
          title={`${thumbsUp} 人点赞`}
        >
          <ReactionThumbsUpIcon filled className="reaction-icon reaction-icon--stats" />
          <span className="text-[10px] font-medium tabular-nums">{thumbsUp}</span>
        </div>
      )}
      {thumbsDown > 0 && (
        <div
          className="log-item-dislike-stats flex items-center gap-0.5"
          title={`${thumbsDown} 人点踩`}
        >
          <ReactionThumbsDownIcon filled className="reaction-icon reaction-icon--stats" />
          <span className="text-[10px] font-medium tabular-nums">{thumbsDown}</span>
        </div>
      )}
    </div>
  )
}

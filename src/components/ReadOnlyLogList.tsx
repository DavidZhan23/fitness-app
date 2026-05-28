import type {
  CommunityPublicExercise,
  CommunityPublicMeal,
  LogItemViewerReaction,
} from '../types'
import { LogItemReactionButtons } from './LogItemReactionButtons'
import { LogItemReactionStats } from './LogItemReactionStats'

interface ReadOnlyLogListProps {
  exercises: CommunityPublicExercise[]
  meals: CommunityPublicMeal[]
  /** 查看他人时可对每条记录点赞/点踩 */
  targetUserId?: string
  canReact?: boolean
  /** 查看自己时展示他人表态人数（只读） */
  showReactionStats?: boolean
  onExerciseReactionChange?: (
    id: string,
    stats: {
      thumbsUp: number
      thumbsDown: number
      viewerReaction: LogItemViewerReaction
    },
  ) => void
  onMealReactionChange?: (
    id: string,
    stats: {
      thumbsUp: number
      thumbsDown: number
      viewerReaction: LogItemViewerReaction
    },
  ) => void
}

export function ReadOnlyLogList({
  exercises,
  meals,
  targetUserId,
  canReact = false,
  showReactionStats = false,
  onExerciseReactionChange,
  onMealReactionChange,
}: ReadOnlyLogListProps) {
  if (exercises.length === 0 && meals.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-600 py-8 text-center text-sm text-muted">
        这一天还没有记录
      </p>
    )
  }

  const showVote = canReact && Boolean(targetUserId)
  const showStats = showReactionStats && Boolean(targetUserId) && !canReact

  return (
    <div className="space-y-4">
      {exercises.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-medium text-brand">运动</h3>
          <ul className="space-y-2">
            {exercises.map((ex) => (
              <li
                key={ex.id}
                className="flex items-center gap-2 rounded-xl bg-card px-3 py-2.5 ring-1 ring-slate-700/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{ex.name}</p>
                  <p className="text-sm text-muted tabular-nums">
                    {Math.round(Number(ex.kcal))} kcal
                  </p>
                </div>
                {showVote && (
                  <LogItemReactionButtons
                    targetUserId={targetUserId!}
                    itemType="exercise"
                    itemId={ex.id}
                    thumbsUp={ex.thumbsUp ?? 0}
                    thumbsDown={ex.thumbsDown ?? 0}
                    viewerReaction={ex.viewerReaction ?? null}
                    onChange={(stats) =>
                      onExerciseReactionChange?.(ex.id, stats)
                    }
                  />
                )}
                {showStats && (
                  <LogItemReactionStats
                    thumbsUp={ex.thumbsUp ?? 0}
                    thumbsDown={ex.thumbsDown ?? 0}
                  />
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      {meals.length > 0 && (
        <section>
          <h3 className="accent-meal mb-2 text-sm font-medium">饮食</h3>
          <ul className="space-y-2">
            {meals.map((m) => (
              <li
                key={m.id}
                className="flex items-center gap-2 rounded-xl bg-card px-3 py-2.5 ring-1 ring-slate-700/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{m.name}</p>
                  <p className="text-sm text-muted tabular-nums">
                    {Math.round(Number(m.kcal))} kcal
                  </p>
                </div>
                {showVote && (
                  <LogItemReactionButtons
                    targetUserId={targetUserId!}
                    itemType="meal"
                    itemId={m.id}
                    thumbsUp={m.thumbsUp ?? 0}
                    thumbsDown={m.thumbsDown ?? 0}
                    viewerReaction={m.viewerReaction ?? null}
                    onChange={(stats) => onMealReactionChange?.(m.id, stats)}
                  />
                )}
                {showStats && (
                  <LogItemReactionStats
                    thumbsUp={m.thumbsUp ?? 0}
                    thumbsDown={m.thumbsDown ?? 0}
                  />
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

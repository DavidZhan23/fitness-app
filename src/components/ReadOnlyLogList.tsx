import { useMemo, useState } from 'react'
import type {
  CommunityPublicExercise,
  CommunityPublicMeal,
  LogItemViewerReaction,
} from '../types'
import { LogItemReactionButtons } from './LogItemReactionButtons'
import { LogItemReactionStats } from './LogItemReactionStats'
import { TodayRecordRow } from './TodayRecordRow'

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
  const [expanded, setExpanded] = useState(true)
  const hasRecords = exercises.length > 0 || meals.length > 0

  const exerciseKcal = useMemo(
    () => exercises.reduce((sum, ex) => sum + Number(ex.kcal), 0),
    [exercises],
  )
  const mealKcal = useMemo(
    () => meals.reduce((sum, m) => sum + Number(m.kcal), 0),
    [meals],
  )

  const countLine = useMemo(() => {
    if (!hasRecords) return null
    const exCount = exercises.length
    const mealCount = meals.length
    if (exCount > 0 && mealCount > 0) {
      return `运动 ${exCount} 条 · 饮食 ${mealCount} 条`
    }
    if (exCount > 0) {
      return `运动 ${exCount} 条 · ${Math.round(exerciseKcal)} kcal`
    }
    return `饮食 ${mealCount} 条 · ${Math.round(mealKcal)} kcal`
  }, [hasRecords, exercises.length, meals.length, exerciseKcal, mealKcal])

  const showVote = canReact && Boolean(targetUserId)
  const showStats = showReactionStats && Boolean(targetUserId) && !canReact

  if (!hasRecords) {
    return (
      <section
        className="today-records-section today-records-section--empty"
        aria-label="当日记录"
      >
        <div className="today-records-section__card">
          <p className="today-records-section__empty-title">这一天还没有记录</p>
        </div>
      </section>
    )
  }

  return (
    <section className="today-records-section" aria-label="当日记录">
      <div className="today-records-section__card">
        <button
          type="button"
          className="today-records-section__toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          <span className="today-records-section__header">
            <span className="today-records-section__heading">当日记录</span>
            <span className="today-records-section__expand-label">
              {expanded ? '收起' : '展开'}
            </span>
          </span>
          {countLine ? (
            <span className="today-records-section__summary">{countLine}</span>
          ) : null}
        </button>

        {expanded ? (
          <div className="today-records-section__body">
            {exercises.length > 0 ? (
              <div className="today-records-section__group today-records-section__group--exercise">
                <p className="today-records-section__group-title">运动</p>
                <ul className="today-records-section__row-list">
                  {exercises.map((ex) => (
                    <TodayRecordRow
                      key={ex.id}
                      asListItem
                      name={ex.name}
                      kcal={Number(ex.kcal)}
                      trailing={
                        showVote ? (
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
                        ) : showStats ? (
                          <LogItemReactionStats
                            thumbsUp={ex.thumbsUp ?? 0}
                            thumbsDown={ex.thumbsDown ?? 0}
                          />
                        ) : null
                      }
                    />
                  ))}
                </ul>
              </div>
            ) : null}
            {meals.length > 0 ? (
              <div className="today-records-section__group today-records-section__group--meal">
                <p className="today-records-section__group-title">饮食</p>
                <ul className="today-records-section__row-list">
                  {meals.map((m) => (
                    <TodayRecordRow
                      key={m.id}
                      asListItem
                      name={m.name}
                      kcal={Number(m.kcal)}
                      trailing={
                        showVote ? (
                          <LogItemReactionButtons
                            targetUserId={targetUserId!}
                            itemType="meal"
                            itemId={m.id}
                            thumbsUp={m.thumbsUp ?? 0}
                            thumbsDown={m.thumbsDown ?? 0}
                            viewerReaction={m.viewerReaction ?? null}
                            onChange={(stats) =>
                              onMealReactionChange?.(m.id, stats)
                            }
                          />
                        ) : showStats ? (
                          <LogItemReactionStats
                            thumbsUp={m.thumbsUp ?? 0}
                            thumbsDown={m.thumbsDown ?? 0}
                          />
                        ) : null
                      }
                    />
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  )
}

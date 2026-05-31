import { useMemo, useState } from 'react'
import { TodayRecordsExpandedList } from './TodayRecordsExpandedList'
import type { Exercise, Meal } from '../types'

interface TodayRecordsSectionProps {
  exercises: Exercise[]
  meals: Meal[]
  exerciseKcal: number
  mealKcal: number
  onDeleteExercise: (id: string) => void
  onDeleteMeal: (id: string) => void
  onUpdateExercise: (id: string, name: string, kcal: number) => Promise<void>
  onUpdateMeal: (id: string, name: string, kcal: number) => Promise<void>
}

export function TodayRecordsSection({
  exercises,
  meals,
  exerciseKcal,
  mealKcal,
  onDeleteExercise,
  onDeleteMeal,
  onUpdateExercise,
  onUpdateMeal,
}: TodayRecordsSectionProps) {
  const [expanded, setExpanded] = useState(false)
  const hasRecords = exercises.length > 0 || meals.length > 0

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

  if (!hasRecords) {
    return (
      <section
        className="today-records-section today-records-section--empty"
        aria-label="今日记录"
      >
        <div className="today-records-section__card">
          <p className="today-records-section__empty-title">还没有记录</p>
          <p className="today-records-section__empty-hint">
            点上方按钮开始记录吧
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="today-records-section" aria-label="今日记录">
      <div className="today-records-section__card">
        <button
          type="button"
          className="today-records-section__toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          <span className="today-records-section__header">
            <span className="today-records-section__heading">今日记录</span>
            <span className="today-records-section__expand-label">
              {expanded ? '收起' : '展开'}
            </span>
          </span>
          {countLine ? (
            <span className="today-records-section__summary">{countLine}</span>
          ) : null}
        </button>

        {expanded ? (
          <TodayRecordsExpandedList
            exercises={exercises}
            meals={meals}
            onDeleteExercise={onDeleteExercise}
            onDeleteMeal={onDeleteMeal}
            onUpdateExercise={onUpdateExercise}
            onUpdateMeal={onUpdateMeal}
          />
        ) : null}
      </div>
    </section>
  )
}

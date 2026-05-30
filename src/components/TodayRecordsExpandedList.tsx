import { useState } from 'react'
import { ConfirmDialog } from './ConfirmDialog'
import { TodayRecordRow } from './TodayRecordRow'
import type { Exercise, Meal } from '../types'

type PendingDelete = {
  kind: 'exercise' | 'meal'
  id: string
  name: string
}

type EditingKey = { kind: 'exercise' | 'meal'; id: string }

interface TodayRecordsExpandedListProps {
  exercises: Exercise[]
  meals: Meal[]
  onDeleteExercise: (id: string) => void
  onDeleteMeal: (id: string) => void
  onUpdateExercise: (id: string, name: string, kcal: number) => Promise<void>
  onUpdateMeal: (id: string, name: string, kcal: number) => Promise<void>
}

export function TodayRecordsExpandedList({
  exercises,
  meals,
  onDeleteExercise,
  onDeleteMeal,
  onUpdateExercise,
  onUpdateMeal,
}: TodayRecordsExpandedListProps) {
  const [editing, setEditing] = useState<EditingKey | null>(null)
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)
  const [deleting, setDeleting] = useState(false)

  const confirmDelete = async () => {
    if (!pendingDelete || deleting) return
    setDeleting(true)
    try {
      if (pendingDelete.kind === 'exercise') {
        await onDeleteExercise(pendingDelete.id)
      } else {
        await onDeleteMeal(pendingDelete.id)
      }
      setPendingDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="today-records-section__body">
      <ConfirmDialog
        open={pendingDelete != null}
        title="永久删除这条记录？"
        message={
          pendingDelete
            ? `「${pendingDelete.name}」删除后无法恢复，确定要继续吗？`
            : ''
        }
        loading={deleting}
        onCancel={() => {
          if (!deleting) setPendingDelete(null)
        }}
        onConfirm={() => void confirmDelete()}
      />
      {exercises.length > 0 ? (
        <div className="today-records-section__group">
          <p className="today-records-section__group-title">运动</p>
          <ul className="today-records-section__row-list">
            {exercises.map((ex) => (
              <TodayRecordRow
                key={ex.id}
                kind="exercise"
                name={ex.name}
                kcal={ex.kcal}
                showActions
                isEditing={
                  editing?.kind === 'exercise' && editing.id === ex.id
                }
                onStartEdit={() => setEditing({ kind: 'exercise', id: ex.id })}
                onCancelEdit={() => setEditing(null)}
                onDelete={() =>
                  setPendingDelete({
                    kind: 'exercise',
                    id: ex.id,
                    name: ex.name,
                  })
                }
                onSave={(name, kcal) => onUpdateExercise(ex.id, name, kcal)}
              />
            ))}
          </ul>
        </div>
      ) : null}
      {meals.length > 0 ? (
        <div className="today-records-section__group">
          <p className="today-records-section__group-title">饮食</p>
          <ul className="today-records-section__row-list">
            {meals.map((m) => (
              <TodayRecordRow
                key={m.id}
                kind="meal"
                name={m.name}
                kcal={m.kcal}
                showActions
                isEditing={editing?.kind === 'meal' && editing.id === m.id}
                onStartEdit={() => setEditing({ kind: 'meal', id: m.id })}
                onCancelEdit={() => setEditing(null)}
                onDelete={() =>
                  setPendingDelete({
                    kind: 'meal',
                    id: m.id,
                    name: m.name,
                  })
                }
                onSave={(name, kcal) => onUpdateMeal(m.id, name, kcal)}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

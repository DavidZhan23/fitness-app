import { useMemo, useState } from 'react'
import { ConfirmDialog } from './ConfirmDialog'
import { TodayMealGroupRow } from './TodayMealGroupRow'
import { TodayRecordRow } from './TodayRecordRow'
import { groupMealsForDisplay } from '../lib/todayMealGroups'
import type { Exercise, Meal } from '../types'

type RecordKey = { kind: 'exercise' | 'meal'; id: string }

type PendingDelete = RecordKey & { name: string }

type EditingKey = RecordKey

function recordKeyOf(key: RecordKey): string {
  return `${key.kind}:${key.id}`
}

interface TodayRecordsExpandedListProps {
  exercises: Exercise[]
  meals: Meal[]
  onDeleteExercise: (id: string) => void
  onDeleteMeal: (id: string) => void
  onBatchDelete: (exerciseIds: string[], mealIds: string[]) => Promise<void>
  onUpdateExercise: (id: string, name: string, kcal: number) => Promise<void>
  onUpdateMeal: (id: string, name: string, kcal: number) => Promise<void>
}

export function TodayRecordsExpandedList({
  exercises,
  meals,
  onDeleteExercise,
  onDeleteMeal,
  onBatchDelete,
  onUpdateExercise,
  onUpdateMeal,
}: TodayRecordsExpandedListProps) {
  const [editing, setEditing] = useState<EditingKey | null>(null)
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [batchConfirmOpen, setBatchConfirmOpen] = useState(false)
  const [batchDeleting, setBatchDeleting] = useState(false)

  const mealGroups = useMemo(() => groupMealsForDisplay(meals), [meals])

  const allKeys = useMemo(
    () => [
      ...exercises.map((ex) => recordKeyOf({ kind: 'exercise', id: ex.id })),
      ...meals.map((m) => recordKeyOf({ kind: 'meal', id: m.id })),
    ],
    [exercises, meals],
  )

  const selectedCount = selectedKeys.size
  const allSelected = allKeys.length > 0 && selectedCount === allKeys.length

  const exitSelectMode = () => {
    setSelectMode(false)
    setSelectedKeys(new Set())
    setBatchConfirmOpen(false)
  }

  const enterSelectMode = () => {
    setEditing(null)
    setSelectMode(true)
    setSelectedKeys(new Set())
  }

  const toggleSelect = (key: RecordKey) => {
    const encoded = recordKeyOf(key)
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(encoded)) next.delete(encoded)
      else next.add(encoded)
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelectedKeys(allSelected ? new Set() : new Set(allKeys))
  }

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

  const confirmBatchDelete = async () => {
    if (batchDeleting || selectedCount === 0) return
    const exerciseIds: string[] = []
    const mealIds: string[] = []
    for (const encoded of selectedKeys) {
      const [kind, id] = encoded.split(':') as ['exercise' | 'meal', string]
      if (kind === 'exercise') exerciseIds.push(id)
      else mealIds.push(id)
    }
    setBatchDeleting(true)
    try {
      await onBatchDelete(exerciseIds, mealIds)
      exitSelectMode()
    } finally {
      setBatchDeleting(false)
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
      <ConfirmDialog
        open={batchConfirmOpen}
        title={`永久删除 ${selectedCount} 条记录？`}
        message="选中的记录删除后无法恢复，确定要继续吗？"
        loading={batchDeleting}
        onCancel={() => {
          if (!batchDeleting) setBatchConfirmOpen(false)
        }}
        onConfirm={() => void confirmBatchDelete()}
      />

      <div className="today-records-section__batch-bar">
        {selectMode ? (
          <>
            <button
              type="button"
              className="today-records-section__batch-link"
              onClick={exitSelectMode}
            >
              取消
            </button>
            <span className="today-records-section__batch-count">
              已选 {selectedCount} 条
            </span>
            <button
              type="button"
              className="today-records-section__batch-link"
              onClick={toggleSelectAll}
            >
              {allSelected ? '取消全选' : '全选'}
            </button>
            <button
              type="button"
              className="today-records-section__batch-delete"
              disabled={selectedCount === 0 || batchDeleting}
              onClick={() => setBatchConfirmOpen(true)}
            >
              删除
            </button>
          </>
        ) : (
          <button
            type="button"
            className="today-records-section__batch-link today-records-section__batch-link--enter"
            onClick={enterSelectMode}
          >
            批量
          </button>
        )}
      </div>

      {exercises.length > 0 ? (
        <div className="today-records-section__group today-records-section__group--exercise">
          <p className="today-records-section__group-title">运动</p>
          <ul className="today-records-section__row-list">
            {exercises.map((ex) => {
              const key = recordKeyOf({ kind: 'exercise', id: ex.id })
              return (
                <TodayRecordRow
                  key={ex.id}
                  name={ex.name}
                  kcal={ex.kcal}
                  showActions
                  selectable={selectMode}
                  selected={selectedKeys.has(key)}
                  onToggleSelect={() =>
                    toggleSelect({ kind: 'exercise', id: ex.id })
                  }
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
              )
            })}
          </ul>
        </div>
      ) : null}
      {meals.length > 0 ? (
        <div className="today-records-section__group today-records-section__group--meal">
          <p className="today-records-section__group-title">饮食</p>
          <ul className="today-records-section__row-list">
            {mealGroups.map((group) => (
              <TodayMealGroupRow
                key={group.key}
                group={group}
                selectMode={selectMode}
                selectedKeys={selectedKeys}
                editing={
                  editing?.kind === 'meal'
                    ? { kind: 'meal', id: editing.id }
                    : null
                }
                onToggleSelect={toggleSelect}
                onStartEdit={(key) => setEditing(key)}
                onCancelEdit={() => setEditing(null)}
                onDelete={(meal) =>
                  setPendingDelete({
                    kind: 'meal',
                    id: meal.id,
                    name: meal.name,
                  })
                }
                onUpdateMeal={onUpdateMeal}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

import { useEffect, useState } from 'react'
import type { Exercise, Meal } from '../types'

type EditingKey = { kind: 'exercise' | 'meal'; id: string }

interface LogListProps {
  exercises: Exercise[]
  meals: Meal[]
  onDeleteExercise: (id: string) => void
  onDeleteMeal: (id: string) => void
  onUpdateExercise: (id: string, name: string, kcal: number) => Promise<void>
  onUpdateMeal: (id: string, name: string, kcal: number) => Promise<void>
}

export function LogList({
  exercises,
  meals,
  onDeleteExercise,
  onDeleteMeal,
  onUpdateExercise,
  onUpdateMeal,
}: LogListProps) {
  const [editing, setEditing] = useState<EditingKey | null>(null)

  if (exercises.length === 0 && meals.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-600 py-8 text-center text-sm text-muted">
        还没有记录，点击下方按钮开始
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {exercises.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-medium text-brand">运动</h3>
          <ul className="space-y-2">
            {exercises.map((ex) => (
              <LogItem
                key={ex.id}
                name={ex.name}
                kcal={ex.kcal}
                isEditing={
                  editing?.kind === 'exercise' && editing.id === ex.id
                }
                onStartEdit={() => setEditing({ kind: 'exercise', id: ex.id })}
                onCancelEdit={() => setEditing(null)}
                onDelete={() => onDeleteExercise(ex.id)}
                onSave={(name, kcal) => onUpdateExercise(ex.id, name, kcal)}
              />
            ))}
          </ul>
        </section>
      )}
      {meals.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-medium text-amber-400">饮食</h3>
          <ul className="space-y-2">
            {meals.map((m) => (
              <LogItem
                key={m.id}
                name={m.name}
                kcal={m.kcal}
                isEditing={editing?.kind === 'meal' && editing.id === m.id}
                onStartEdit={() => setEditing({ kind: 'meal', id: m.id })}
                onCancelEdit={() => setEditing(null)}
                onDelete={() => onDeleteMeal(m.id)}
                onSave={(name, kcal) => onUpdateMeal(m.id, name, kcal)}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function LogItem({
  name: savedName,
  kcal: savedKcal,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onDelete,
  onSave,
}: {
  name: string
  kcal: number
  isEditing: boolean
  onStartEdit: () => void
  onCancelEdit: () => void
  onDelete: () => void
  onSave: (name: string, kcal: number) => Promise<void>
}) {
  const [name, setName] = useState(savedName)
  const [kcal, setKcal] = useState(String(Math.round(savedKcal)))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isEditing) {
      setName(savedName)
      setKcal(String(Math.round(savedKcal)))
      setError('')
    }
  }, [savedName, savedKcal, isEditing])

  const handleSave = async () => {
    const trimmed = name.trim()
    const k = parseFloat(kcal)
    if (!trimmed || !k || k <= 0) {
      setError('请填写名称和有效热量')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave(trimmed, k)
      onCancelEdit()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  if (isEditing) {
    return (
      <li className="space-y-2 rounded-xl bg-card px-3 py-2.5 ring-1 ring-brand/40">
        <label className="block">
          <span className="text-xs text-muted">名称</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input mt-1 py-2 text-sm"
            autoFocus
          />
        </label>
        <label className="block">
          <span className="text-xs text-muted">热量 (kcal)</span>
          <input
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={kcal}
            onChange={(e) => setKcal(e.target.value)}
            className="input mt-1 py-2 text-sm tabular-nums"
          />
        </label>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancelEdit}
            disabled={saving}
            className="rounded-lg px-3 py-1.5 text-xs text-muted hover:bg-slate-700/50 disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="rounded-lg bg-brand-dark px-3 py-1.5 text-xs font-medium disabled:opacity-50"
          >
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </li>
    )
  }

  return (
    <li className="flex items-center justify-between gap-2 rounded-xl bg-card px-3 py-2.5 ring-1 ring-slate-700/50">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{savedName}</p>
        <p className="text-sm text-muted tabular-nums">
          {Math.round(savedKcal)} kcal
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onStartEdit}
          className="rounded-lg px-2 py-1 text-xs text-brand hover:bg-brand/10"
        >
          修改
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg px-2 py-1 text-xs text-red-400 hover:bg-red-500/10"
          aria-label="删除"
        >
          删除
        </button>
      </div>
    </li>
  )
}

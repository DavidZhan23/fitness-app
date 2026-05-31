import { useEffect, useState, type ReactNode } from 'react'
import { RecordDeleteButton, RecordEditButton } from './RecordActionIcons'

interface TodayRecordRowProps {
  name: string
  kcal: number
  showActions?: boolean
  /** 在 ul 内渲染为 li（社区只读列表） */
  asListItem?: boolean
  trailing?: ReactNode
  isEditing?: boolean
  onStartEdit?: () => void
  onCancelEdit?: () => void
  onDelete?: () => void
  onSave?: (name: string, kcal: number) => Promise<void>
}

export function TodayRecordRow({
  name: savedName,
  kcal: savedKcal,
  showActions = false,
  asListItem = false,
  trailing,
  isEditing = false,
  onStartEdit,
  onCancelEdit,
  onDelete,
  onSave,
}: TodayRecordRowProps) {
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
    if (!onSave || !onCancelEdit) return
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

  if (isEditing && showActions) {
    return (
      <li className="today-records-section__row today-records-section__row--editing">
        <div className="today-records-section__row-edit">
          <label className="block">
            <span className="text-xs text-muted">名称</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input mt-1 w-full min-w-0 py-2 text-sm"
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
              className="input mt-1 w-full min-w-0 py-2 text-sm tabular-nums"
            />
          </label>
          {error ? <p className="text-xs text-danger">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancelEdit}
              disabled={saving}
              className="rounded-lg px-3 py-1.5 text-xs text-muted hover:opacity-80 disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="btn-primary rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-70"
            >
              {saving ? '保存中…' : '保存'}
            </button>
          </div>
        </div>
      </li>
    )
  }

  const RowTag = showActions || asListItem ? 'li' : 'div'

  return (
    <RowTag className="today-records-section__row">
      <div className="today-records-section__row-main">
        <span className="today-records-section__row-title">{savedName}</span>
      </div>
      <span className="today-records-section__row-meta">
        {Math.round(savedKcal)} kcal
      </span>
      {showActions && onStartEdit && onDelete ? (
        <div className="today-records-section__row-actions">
          <RecordEditButton onClick={onStartEdit} />
          <RecordDeleteButton onClick={onDelete} />
        </div>
      ) : trailing ? (
        <div className="today-records-section__row-actions">{trailing}</div>
      ) : null}
    </RowTag>
  )
}

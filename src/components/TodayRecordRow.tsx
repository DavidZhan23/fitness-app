import { useEffect, useState, type ReactNode } from 'react'
import { RecordDeleteButton, RecordEditButton } from './RecordActionIcons'
import {
  MACRO_FIELDS,
  mealMacroDraft,
  parseMacroDraft,
  type MacroField,
} from '../lib/macroTargets'
import type { Meal, MealMacrosInput } from '../types'

interface TodayRecordRowProps {
  name: string
  kcal: number
  showActions?: boolean
  /** 在 ul 内渲染为 li（社区只读列表） */
  asListItem?: boolean
  trailing?: ReactNode
  isEditing?: boolean
  selectable?: boolean
  selected?: boolean
  onToggleSelect?: () => void
  onStartEdit?: () => void
  onCancelEdit?: () => void
  onDelete?: () => void
  meal?: Meal
  onSave?: (name: string, kcal: number, macros?: MealMacrosInput) => Promise<void>
}

export function TodayRecordRow({
  name: savedName,
  kcal: savedKcal,
  showActions = false,
  asListItem = false,
  trailing,
  isEditing = false,
  selectable = false,
  selected = false,
  onToggleSelect,
  onStartEdit,
  onCancelEdit,
  onDelete,
  onSave,
  meal,
}: TodayRecordRowProps) {
  const [name, setName] = useState(savedName)
  const [kcal, setKcal] = useState(String(Math.round(savedKcal)))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [macroDraft, setMacroDraft] = useState(() => mealMacroDraft(meal))
  const [macroTouched, setMacroTouched] = useState(false)

  useEffect(() => {
    if (!isEditing) {
      setName(savedName)
      setKcal(String(Math.round(savedKcal)))
      setError('')
      setMacroDraft(mealMacroDraft(meal))
      setMacroTouched(false)
    }
  }, [savedName, savedKcal, meal, isEditing])

  const setMacroField = (field: MacroField, value: string) => {
    setMacroTouched(true)
    setMacroDraft((current) => ({ ...current, [field]: value }))
  }

  const handleSave = async () => {
    if (!onSave || !onCancelEdit) return
    const trimmed = name.trim()
    const k = parseFloat(kcal)
    if (!trimmed || !k || k <= 0) {
      setError('请填写名称和有效热量')
      return
    }
    const parsedMacros = meal && macroTouched ? parseMacroDraft(macroDraft) : null
    if (parsedMacros && !parsedMacros.ok) {
      setError(parsedMacros.error)
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave(trimmed, k, parsedMacros?.macros)
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
          {meal ? (
            <details className="macro-input-disclosure">
              <summary>营养素（选填）</summary>
              <div className="macro-input-grid">
                {MACRO_FIELDS.map((field) => {
                  const label = {
                    protein_g: '蛋白质',
                    fat_g: '脂肪',
                    carbs_g: '碳水',
                    sugar_g: '添加糖',
                  }[field]
                  return (
                    <label key={field} className="block">
                      <span className="text-xs text-muted">{label} (g)</span>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        inputMode="decimal"
                        value={macroDraft[field]}
                        onChange={(event) => setMacroField(field, event.target.value)}
                        className="input mt-1 w-full min-w-0 py-2 text-sm tabular-nums"
                      />
                    </label>
                  )
                })}
              </div>
              <p className="macro-input-disclosure__hint">
                仅记配料中额外加入的糖；不记完整水果、牛奶中天然糖。
              </p>
            </details>
          ) : null}
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
    <RowTag
      className={`today-records-section__row${
        selectable && selected ? ' today-records-section__row--selected' : ''
      }`}
    >
      {selectable && onToggleSelect ? (
        <label className="today-records-section__row-select">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            aria-label={`选择 ${savedName}`}
          />
        </label>
      ) : null}
      <div className="today-records-section__row-main">
        <span className="today-records-section__row-title">{savedName}</span>
      </div>
      <span className="today-records-section__row-meta">
        {Math.round(savedKcal)} kcal
      </span>
      {showActions && !selectable && onStartEdit && onDelete ? (
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

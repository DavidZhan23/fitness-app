import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../context/AuthContext'
import {
  DEFICIT_GOAL_MAX,
  DEFICIT_GOAL_MIN,
  DEFICIT_GOAL_PRESETS,
  parseDeficitGoalInput,
} from '../lib/deficitGoal'

interface DeficitGoalSheetProps {
  open: boolean
  currentThreshold: number
  onClose: () => void
}

export function DeficitGoalSheet({
  open,
  currentThreshold,
  onClose,
}: DeficitGoalSheetProps) {
  const { updateProfile } = useAuth()
  const [selected, setSelected] = useState<number | 'custom'>(500)
  const [customValue, setCustomValue] = useState('500')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    const t = Math.round(currentThreshold)
    const preset = DEFICIT_GOAL_PRESETS.find((p) => p.kcal === t)
    if (preset) {
      setSelected(preset.kcal)
      setCustomValue(String(preset.kcal))
    } else if (t > 0) {
      setSelected('custom')
      setCustomValue(String(t))
    } else {
      setSelected(500)
      setCustomValue('500')
    }
    setError('')
  }, [open, currentThreshold])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, saving, onClose])

  const resolvedValue = (): number | null => {
    if (selected !== 'custom') return selected
    return parseDeficitGoalInput(customValue)
  }

  const handleSave = async () => {
    const value = resolvedValue()
    if (value == null) {
      setError(`请输入 ${DEFICIT_GOAL_MIN}–${DEFICIT_GOAL_MAX} 之间的整数 kcal`)
      return
    }
    setSaving(true)
    setError('')
    try {
      await updateProfile({ deficit_threshold: value })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const selectPreset = (kcal: number) => {
    setSelected(kcal)
    setCustomValue(String(kcal))
    setError('')
  }

  if (!open) return null

  return createPortal(
    <div
      className="deficit-goal-sheet fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="deficit-goal-sheet-title"
    >
      <button
        type="button"
        className="deficit-goal-sheet__backdrop absolute inset-0"
        aria-label="关闭"
        disabled={saving}
        onClick={onClose}
      />
      <div className="deficit-goal-sheet__panel relative w-full max-w-sm px-5 py-5">
        <h2 id="deficit-goal-sheet-title" className="deficit-goal-sheet__title text-lg font-semibold">
          默认目标缺口
        </h2>
        <p className="deficit-goal-sheet__desc mt-1 text-sm text-muted">
          设置你希望每天达到的热量缺口。
        </p>

        <div className="deficit-goal-sheet__preset-grid mt-4">
          {DEFICIT_GOAL_PRESETS.map((preset) => (
            <button
              key={preset.kcal}
              type="button"
              disabled={saving}
              className="deficit-goal-sheet__preset-card"
              aria-pressed={selected === preset.kcal}
              onClick={() => selectPreset(preset.kcal)}
            >
              <span className="deficit-goal-sheet__preset-kcal tabular-nums">
                {preset.kcal} kcal
              </span>
              <span className="deficit-goal-sheet__preset-label">{preset.label}</span>
            </button>
          ))}
        </div>

        <div className="deficit-goal-sheet__custom mt-3">
          <span className="deficit-goal-sheet__custom-label text-xs text-muted">自定义</span>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={5000}
              step={1}
              inputMode="numeric"
              value={customValue}
              disabled={saving}
              onChange={(e) => {
                setSelected('custom')
                setCustomValue(e.target.value)
                setError('')
              }}
              onFocus={() => setSelected('custom')}
              className="input min-w-0 flex-1 py-2 text-sm tabular-nums"
              aria-label="自定义目标缺口 kcal"
            />
            <span className="shrink-0 text-sm text-muted">kcal</span>
          </div>
          <p className="mt-1 text-xs text-muted">建议范围 300–800 kcal</p>
        </div>

        {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="deficit-goal-sheet__cancel flex-1 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="deficit-goal-sheet__save btn-primary flex-1 rounded-xl py-2.5 text-sm font-medium disabled:opacity-70"
          >
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

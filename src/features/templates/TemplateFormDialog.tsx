import { useEffect, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { ResponsiveForm } from '../../components/ui/responsive'
import { computeDraftKcal, toFinitePositive } from '../../lib/logTemplate'
import type { LogTemplate } from '../../types'

export interface TemplateFormValues {
  name: string
  unit: string
  kcalPerUnit: string
  defaultQuantity: string
}

interface TemplateFormDialogProps {
  open: boolean
  mode: 'add' | 'edit'
  template?: LogTemplate | null
  kind: 'exercise' | 'meal'
  saving: boolean
  error: string
  onClose: () => void
  onSubmit: (values: {
    name: string
    unit: string
    kcalPerUnit: number
    defaultQuantity: number
  }) => void | Promise<void>
}

function emptyForm(): TemplateFormValues {
  return { name: '', unit: '', kcalPerUnit: '', defaultQuantity: '' }
}

function formFromTemplate(template: LogTemplate): TemplateFormValues {
  return {
    name: template.name,
    unit: template.unit,
    kcalPerUnit: String(template.kcalPerUnit),
    defaultQuantity: String(template.defaultQuantity),
  }
}

const PLACEHOLDERS = {
  meal: {
    name: '例如：鸡胸肉',
    unit: '例如：g / 个 / 份',
    kcalPerUnit: '例如：1.65',
    defaultQuantity: '例如：100',
  },
  exercise: {
    name: '例如：慢跑',
    unit: '例如：分钟',
    kcalPerUnit: '例如：10',
    defaultQuantity: '例如：30',
  },
} as const

function dialogTitle(mode: 'add' | 'edit', kindLabel: string): string {
  if (mode === 'add') return `新建${kindLabel}模板`
  return `编辑${kindLabel}模板`
}

function dialogSubtitle(mode: 'add' | 'edit', kind: 'exercise' | 'meal'): string {
  if (mode === 'edit') {
    return '修改只影响之后的快捷记录，不会改变已保存的历史记录。'
  }
  if (kind === 'meal') {
    return '常吃的食物可以存成模板，下次快捷记录时直接点选。'
  }
  return '常练的运动可以存成模板，下次快捷记录时直接点选。'
}

export function TemplateFormDialog({
  open,
  mode,
  template,
  kind,
  saving,
  error,
  onClose,
  onSubmit,
}: TemplateFormDialogProps) {
  const [form, setForm] = useState<TemplateFormValues>(emptyForm)
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    if (!open) return
    setLocalError('')
    if (mode === 'edit' && template) {
      setForm(formFromTemplate(template))
    } else {
      setForm(emptyForm())
    }
  }, [open, mode, template])

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

  if (!open) return null

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (saving) return

    const name = form.name.trim()
    const unit = form.unit.trim()
    const kcalPerUnit = toFinitePositive(form.kcalPerUnit)
    const defaultQuantity = toFinitePositive(form.defaultQuantity)
    if (!name) {
      setLocalError('请填写模板名称')
      return
    }
    if (!unit) {
      setLocalError('请填写单位')
      return
    }
    if (kcalPerUnit == null) {
      setLocalError('请填写有效的单位热量')
      return
    }
    if (defaultQuantity == null) {
      setLocalError('请填写有效的默认数量')
      return
    }
    setLocalError('')
    await onSubmit({ name, unit, kcalPerUnit, defaultQuantity })
  }

  const displayError = localError || error
  const kindLabel = kind === 'exercise' ? '运动' : '饮食'
  const placeholders = PLACEHOLDERS[kind]

  const defaultQty = toFinitePositive(form.defaultQuantity)
  const kcalRate = toFinitePositive(form.kcalPerUnit)
  const previewKcal =
    defaultQty != null && kcalRate != null
      ? computeDraftKcal(defaultQty, kcalRate)
      : null
  const canPreview =
    form.name.trim() !== '' &&
    form.unit.trim() !== '' &&
    defaultQty != null &&
    previewKcal != null

  const previewText = canPreview
    ? `${form.name.trim()} · ${form.defaultQuantity}${form.unit.trim()} ≈ ${previewKcal} kcal`
    : '填写完整后会显示默认记录热量。'

  return createPortal(
    <div
      className="template-form-dialog fixed inset-0 z-[100] flex items-end justify-center sm:items-center"
      data-template-kind={kind}
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-form-dialog-title"
    >
      <button
        type="button"
        className="template-form-dialog__backdrop absolute inset-0"
        aria-label="关闭"
        onClick={saving ? undefined : onClose}
      />
      <div className="template-form-dialog__panel relative">
        <header className="template-form-dialog__header">
          <h2 id="template-form-dialog-title" className="template-form-dialog__title">
            {dialogTitle(mode, kindLabel)}
          </h2>
          <p className="template-form-dialog__subtitle">{dialogSubtitle(mode, kind)}</p>
        </header>
        <ResponsiveForm
          onSubmit={(e) => void handleSubmit(e)}
          className="template-form-dialog__form"
        >
          <div className="template-form-dialog__body">
            <div className="template-form-dialog__fields">
              <label className="template-form-dialog__field">
                <span className="template-form-dialog__label">模板名称</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="input w-full min-w-0"
                  placeholder={placeholders.name}
                  autoFocus
                  disabled={saving}
                />
              </label>
              <label className="template-form-dialog__field">
                <span className="template-form-dialog__label">单位</span>
                <input
                  type="text"
                  value={form.unit}
                  onChange={(e) => setForm((prev) => ({ ...prev, unit: e.target.value }))}
                  className="input w-full min-w-0"
                  placeholder={placeholders.unit}
                  disabled={saving}
                />
              </label>
              <label className="template-form-dialog__field">
                <span className="template-form-dialog__label">单位热量（kcal / 单位）</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={form.kcalPerUnit}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, kcalPerUnit: e.target.value }))
                  }
                  className="input w-full min-w-0 tabular-nums"
                  placeholder={placeholders.kcalPerUnit}
                  disabled={saving}
                />
              </label>
              <label className="template-form-dialog__field">
                <span className="template-form-dialog__label">默认数量</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={form.defaultQuantity}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, defaultQuantity: e.target.value }))
                  }
                  className="input w-full min-w-0 tabular-nums"
                  placeholder={placeholders.defaultQuantity}
                  disabled={saving}
                />
              </label>
            </div>
            {displayError ? (
              <p className="template-form-dialog__error" role="alert">
                {displayError}
              </p>
            ) : null}
            <div className="template-form-dialog__preview" aria-live="polite">
              <span className="template-form-dialog__preview-label">预览</span>
              <span className="template-form-dialog__preview-text">{previewText}</span>
            </div>
          </div>
          <footer className="template-form-dialog__footer">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="template-form-dialog__cancel"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="template-form-dialog__save btn-primary"
            >
              {saving ? '保存中…' : mode === 'add' ? '保存' : '保存修改'}
            </button>
          </footer>
        </ResponsiveForm>
      </div>
    </div>,
    document.body,
  )
}

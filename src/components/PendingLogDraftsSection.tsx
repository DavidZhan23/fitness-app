import type { RefObject } from 'react'
import {
  computeDraftKcal,
  formatApproxKcal,
  toFinitePositive,
} from '../lib/logTemplate'
import type { PendingLogDraft } from '../hooks/usePendingLogDrafts'

interface PendingLogDraftsSectionProps {
  drafts: PendingLogDraft[]
  saving: boolean
  hasInvalidQuantity: boolean
  error: string
  highlight?: boolean
  sectionRef: RefObject<HTMLElement | null>
  onQuantityChange: (key: string, value: string) => void
  onRemove: (key: string) => void
  onConfirmSave: () => void
}

export function PendingLogDraftsSection({
  drafts,
  saving,
  hasInvalidQuantity,
  error,
  highlight = false,
  sectionRef,
  onQuantityChange,
  onRemove,
  onConfirmSave,
}: PendingLogDraftsSectionProps) {
  if (drafts.length === 0) return null

  return (
    <section
      ref={sectionRef}
      aria-label="确认数量后保存"
      className={`log-pending-drafts${highlight ? ' log-pending-drafts--highlight' : ''}`}
    >
      <p className="log-section-title log-pending-drafts__title">
        确认数量后保存
      </p>
      <p className="log-pending-drafts__subtitle">
        已选 {drafts.length} 项，可以修改数量。
      </p>
      <ul className="log-pending-drafts__list space-y-3">
        {drafts.map((draft) => {
          const quantity = toFinitePositive(draft.quantityInput)
          const kcal =
            quantity == null
              ? null
              : computeDraftKcal(quantity, draft.template.kcalPerUnit)
          return (
            <li key={draft.key} className="log-pending-draft-row">
              <div className="log-pending-draft-row__header">
                <p className="font-medium text-primary">{draft.template.name}</p>
                <button
                  type="button"
                  className="log-pending-draft-row__remove text-xs text-muted hover:text-secondary"
                  onClick={() => onRemove(draft.key)}
                  disabled={saving}
                >
                  移除
                </button>
              </div>
              <div className="log-pending-draft-row__fields">
                <label className="log-pending-draft-row__quantity">
                  <span className="sr-only">{draft.template.name} 数量</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    inputMode="decimal"
                    value={draft.quantityInput}
                    onChange={(e) => onQuantityChange(draft.key, e.target.value)}
                    disabled={saving}
                    className="input w-full min-w-0 tabular-nums"
                  />
                </label>
                <span className="log-pending-draft-row__unit text-sm text-secondary">
                  {draft.template.unit}
                </span>
              </div>
              <p className="log-pending-draft-row__kcal text-sm text-muted tabular-nums">
                {formatApproxKcal(kcal)}
              </p>
            </li>
          )
        })}
      </ul>
      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
      <button
        type="button"
        disabled={saving || drafts.length === 0 || hasInvalidQuantity}
        onClick={onConfirmSave}
        className="btn-primary log-pending-drafts__save mt-3 w-full py-3 disabled:opacity-50"
      >
        {saving ? '保存中…' : `确认并保存 ${drafts.length} 条`}
      </button>
    </section>
  )
}

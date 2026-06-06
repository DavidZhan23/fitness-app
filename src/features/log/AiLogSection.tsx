import { useState } from 'react'
import { httpData } from '../../lib/api'
import {
  CONFIDENCE_LABELS,
  FALLBACK_REASON,
  normalizeConfidence,
  resolveReason,
  type AiEstimateConfidence,
} from '../../lib/aiEstimateDisplay'
import {
  formatApproxKcal,
  formatQtyForDisplay,
  toFinitePositive,
  validateAiItems,
} from '../../lib/logTemplate'
import { trackMetric } from '../../lib/telemetry'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { RecordDeleteButton } from '../../components/RecordActionIcons'
import { MealPhotoSection } from './MealPhotoSection'

type PendingDeleteItem = { id: string; name: string }

type MealInputMode = 'text' | 'photo'

export interface AiEstimateItemState {
  id: string
  name: string
  quantityInput: string
  unit: string
  kcalInput: string
  confidence: AiEstimateConfidence
  reason: string
  saveAsTemplate: boolean
}

interface AiLogSectionProps {
  kind: 'exercise' | 'meal'
  description: string
  onDescriptionChange: (value: string) => void
  saving: boolean
  onSave: (items: AiEstimateItemState[]) => Promise<string | null>
  onAiOutcome?: (outcome: 'success' | 'timeout' | 'error') => void
  disabled?: boolean
  showDescriptionInput?: boolean
}

function classifyErrorType(err: unknown): 'network' | 'error' {
  if (err instanceof TypeError) return 'network'
  if (err instanceof Error && /无法连接|网络|network/i.test(err.message)) {
    return 'network'
  }
  return 'error'
}

function createItemId() {
  return `ai-item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function formatItemSummaryMeta(item: AiEstimateItemState): string {
  const qty = toFinitePositive(item.quantityInput)
  const kcal = toFinitePositive(item.kcalInput)
  const qtyText =
    qty != null
      ? formatQtyForDisplay(qty)
      : item.quantityInput.trim() || '—'
  const unit = item.unit.trim() || '—'
  const kcalText = kcal != null ? formatApproxKcal(kcal) : '—'
  return `${qtyText} ${unit} · ${kcalText}`
}

function sumAiItemsKcal(items: AiEstimateItemState[]): number | null {
  let total = 0
  let hasValue = false
  for (const item of items) {
    const kcal = toFinitePositive(item.kcalInput)
    if (kcal == null) continue
    total += kcal
    hasValue = true
  }
  return hasValue ? total : null
}

function mapResponseItems(
  description: string,
  kind: 'exercise' | 'meal',
  response: {
    kcal: number
    items?: {
      name: string
      quantity?: number
      unit?: string
      kcal: number
      confidence?: AiEstimateConfidence
      reason?: string
    }[]
  },
): AiEstimateItemState[] {
  const defaultUnit = kind === 'meal' ? '份' : '分钟'

  if (response.items?.length) {
    return response.items.map((item) => {
      const confidence = normalizeConfidence(item.confidence)
      return {
        id: createItemId(),
        name: item.name,
        quantityInput: String(item.quantity ?? 1),
        unit: item.unit?.trim() || defaultUnit,
        kcalInput: String(item.kcal),
        confidence,
        reason: resolveReason(item.reason, confidence),
        saveAsTemplate: false,
      }
    })
  }

  return [
    {
      id: createItemId(),
      name: description,
      quantityInput: '1',
      unit: defaultUnit,
      kcalInput: String(response.kcal),
      confidence: 'medium',
      reason: FALLBACK_REASON,
      saveAsTemplate: false,
    },
  ]
}

export function AiLogSection({
  kind,
  description,
  onDescriptionChange,
  saving,
  onSave,
  onAiOutcome,
  disabled,
  showDescriptionInput = true,
}: AiLogSectionProps) {
  const [items, setItems] = useState<AiEstimateItemState[]>([])
  const [expandedItemIds, setExpandedItemIds] = useState<Record<string, boolean>>({})
  const [estimating, setEstimating] = useState(false)
  const [estimateError, setEstimateError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [hasEstimate, setHasEstimate] = useState(false)
  const [mealInputMode, setMealInputMode] = useState<MealInputMode>('text')
  const [pendingDelete, setPendingDelete] = useState<PendingDeleteItem | null>(
    null,
  )

  const isExercise = kind === 'exercise'
  const isMeal = kind === 'meal'
  const sectionTitle = isExercise ? '做了什么运动？' : '吃了什么？'
  const sectionHint = isExercise
    ? '描述运动和时长即可；AI 只估运动额外消耗，不含基础代谢。'
    : '不用精确到克数，像聊天一样描述也可以。'
  const fuzzyHint = isExercise
    ? '支持模糊输入：像聊天一样写，比如“晚饭后散步一会儿”。'
    : '支持模糊输入：像聊天一样写，比如“一碗牛肉面”。'
  const placeholder = isExercise
    ? '例如：慢跑 40 分钟 + 拉伸 10 分钟'
    : '例如：一碗牛肉面 + 一个鸡蛋'

  const busy = disabled || saving || estimating

  const resetEstimateState = () => {
    setEstimateError('')
    setHasEstimate(false)
    setItems([])
    setExpandedItemIds({})
  }

  const applyEstimateResponse = (
    response: {
      kcal: number
      items?: {
        name: string
        quantity?: number
        unit?: string
        kcal: number
        confidence?: AiEstimateConfidence
        reason?: string
      }[]
    },
    labelFallback: string,
  ) => {
    const nextItems = mapResponseItems(labelFallback, kind, response)
    setItems(nextItems)
    setExpandedItemIds({})
    setHasEstimate(true)
  }

  const trackEstimateMetric = (
    name: 'ai_estimate_success' | 'ai_estimate_timeout' | 'ai_estimate_error',
    durationMs: number,
    inputMode: 'ai' | 'photo',
    inputLength: number,
    errorType?: 'timeout' | 'network' | 'error',
  ) => {
    if (name === 'ai_estimate_success') {
      onAiOutcome?.('success')
      trackMetric({
        name,
        durationMs,
        metadata: {
          kind,
          input_mode: inputMode,
          input_length: inputLength,
          duration_ms: durationMs,
          status: 'ok',
        },
      })
      return
    }

    if (name === 'ai_estimate_timeout') {
      onAiOutcome?.('timeout')
      trackMetric({
        name,
        durationMs,
        metadata: {
          kind,
          input_mode: inputMode,
          input_length: inputLength,
          duration_ms: durationMs,
          status: 'timeout',
          error_type: 'timeout',
        },
      })
      return
    }

    onAiOutcome?.('error')
    trackMetric({
      name,
      durationMs,
      metadata: {
        kind,
        input_mode: inputMode,
        input_length: inputLength,
        duration_ms: durationMs,
        status: 'error',
        error_type: errorType ?? 'error',
      },
    })
  }

  const runEstimate = async (
    estimateFn: (signal: AbortSignal) => Promise<{
      kcal: number
      items?: {
        name: string
        quantity?: number
        unit?: string
        kcal: number
        confidence?: AiEstimateConfidence
        reason?: string
      }[]
    }>,
    labelFallback: string,
    inputMode: 'ai' | 'photo',
    inputLength: number,
  ) => {
    setEstimating(true)
    resetEstimateState()

    const started = performance.now()
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), 45_000)

    try {
      const response = await estimateFn(controller.signal)
      applyEstimateResponse(response, labelFallback)
      trackEstimateMetric(
        'ai_estimate_success',
        Math.round(performance.now() - started),
        inputMode,
        inputLength,
      )
    } catch (err) {
      const durationMs = Math.round(performance.now() - started)
      if (err instanceof Error && err.name === 'AbortError') {
        setEstimateError(
          inputMode === 'photo' ? '识别超时，请稍后重试' : '估算超时，请稍后重试',
        )
        trackEstimateMetric('ai_estimate_timeout', durationMs, inputMode, inputLength)
      } else {
        setEstimateError(err instanceof Error ? err.message : '估算失败')
        trackEstimateMetric(
          'ai_estimate_error',
          durationMs,
          inputMode,
          inputLength,
          classifyErrorType(err),
        )
      }
    } finally {
      window.clearTimeout(timeoutId)
      setEstimating(false)
    }
  }

  const updateItem = (
    id: string,
    patch: Partial<AiEstimateItemState>,
  ) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    )
  }

  const toggleItemExpanded = (id: string) => {
    setExpandedItemIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const requestRemoveItem = (id: string, name: string) => {
    setPendingDelete({ id, name: name.trim() || '未命名' })
  }

  const confirmRemoveItem = () => {
    if (!pendingDelete) return
    const { id } = pendingDelete
    setItems((prev) => prev.filter((item) => item.id !== id))
    setExpandedItemIds((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    setSaveError('')
    setPendingDelete(null)
  }

  const totalKcal = sumAiItemsKcal(items)

  const handleEstimate = async () => {
    const desc = description.trim()
    if (desc.length < 2) {
      setEstimateError('请先输入内容（可含时长、分量，估算更准）')
      return
    }

    await runEstimate(
      (signal) => httpData.estimateKcal(kind, desc, { signal }),
      desc,
      'ai',
      desc.length,
    )
  }

  const handlePhotoEstimate = async (payload: {
    imageDataUrl: string
    supplement: string
  }) => {
    await runEstimate(
      (signal) =>
        httpData.estimateKcalFromPhoto(payload.imageDataUrl, payload.supplement, {
          signal,
        }),
      payload.supplement.trim() || '餐食照片',
      'photo',
      payload.supplement.trim().length,
    )
  }

  const switchMealInputMode = (mode: MealInputMode) => {
    if (busy) return
    setMealInputMode(mode)
    resetEstimateState()
    setSaveError('')
  }

  const handleSave = async () => {
    if (items.length === 0) {
      setSaveError('至少保留一条记录，或删除后重新估算')
      return
    }
    const validated = validateAiItems(items)
    if (validated.ok === false) {
      setSaveError(validated.error)
      return
    }
    setSaveError('')
    try {
      const notice = await onSave(items)
      if (notice) {
        // Parent navigates away; notice is best-effort before navigate
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '保存失败')
    }
  }

  return (
    <>
      <ConfirmDialog
        open={pendingDelete != null}
        title="删除这条估算结果？"
        message={
          pendingDelete
            ? `「${pendingDelete.name}」将从本次估算中移除，确定要继续吗？`
            : ''
        }
        confirmLabel="确定删除"
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmRemoveItem}
      />
    <section aria-label="AI 估算" className="log-ai-section">
      <div className="log-ai-card px-4 py-4">
        <header className="log-ai-card__header">
          <h2 className="log-section-title">{sectionTitle}</h2>
          <p className="log-ai-card__hint">{sectionHint}</p>
        </header>

        {isMeal ? (
          <div
            className="log-ai-mode-tabs"
            role="tablist"
            aria-label="饮食记录方式"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mealInputMode === 'text'}
              className={`log-ai-mode-tab${mealInputMode === 'text' ? ' log-ai-mode-tab--active' : ''}`}
              onClick={() => switchMealInputMode('text')}
              disabled={busy}
            >
              文字描述
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mealInputMode === 'photo'}
              className={`log-ai-mode-tab${mealInputMode === 'photo' ? ' log-ai-mode-tab--active' : ''}`}
              onClick={() => switchMealInputMode('photo')}
              disabled={busy}
            >
              拍照识别
            </button>
          </div>
        ) : null}

        {isMeal && mealInputMode === 'photo' ? (
          <MealPhotoSection
            disabled={disabled || saving}
            estimating={estimating}
            estimateError={estimateError}
            onEstimate={handlePhotoEstimate}
          />
        ) : (
          <>
            {showDescriptionInput ? (
              <label className="block">
                <input
                  value={description}
                  onChange={(e) => {
                    onDescriptionChange(e.target.value)
                    setEstimateError('')
                  }}
                  disabled={busy}
                  className="input w-full min-w-0"
                  placeholder={placeholder}
                />
              </label>
            ) : (
              <p className="log-ai-card__hint">{fuzzyHint}</p>
            )}

            <p className="log-ai-fuzzy-hint">{fuzzyHint}</p>

            <button
              type="button"
              disabled={busy}
              onClick={() => void handleEstimate()}
              className="log-ai-btn w-full py-3 text-sm font-medium disabled:opacity-50"
            >
              {estimating ? '估算中…' : 'AI 估算热量'}
            </button>

            {estimateError ? (
              <p className="text-xs text-red-400">{estimateError}</p>
            ) : null}
          </>
        )}

        {hasEstimate ? (
          <section aria-label="AI 估算结果" className="log-ai-results">
            <header className="log-ai-results__header">
              <div className="log-ai-results__heading">
                <h3 className="log-ai-results__title">AI 估算结果</h3>
                {items.length > 0 ? (
                  <p className="log-ai-results__stats tabular-nums">
                    <span>{items.length} 条</span>
                    {totalKcal != null ? (
                      <>
                        <span className="log-ai-results__stats-sep" aria-hidden>
                          ·
                        </span>
                        <span>合计约 {Math.round(totalKcal)} kcal</span>
                      </>
                    ) : null}
                  </p>
                ) : null}
              </div>
              <p className="log-ai-results__hint">
                {items.length > 0
                  ? '识别有误的可直接删除该条；保留正确的再保存。'
                  : '已全部移除。可重新估算，或返回修改描述。'}
              </p>
            </header>

            {items.length > 0 ? (
              <div className="log-ai-results__list">
                {items.map((item) => {
                  const expanded = Boolean(expandedItemIds[item.id])
                  const itemLabel = item.name.trim() || '未命名'

                  return (
                    <article
                      key={item.id}
                      className={`log-ai-item-card${expanded ? ' log-ai-item-card--expanded' : ''}`}
                    >
                      <div className="log-ai-item-card__summary">
                        <div className="log-ai-item-card__summary-main">
                          <strong className="log-ai-item-card__title">
                            {itemLabel}
                          </strong>
                          <span className="log-ai-item-card__meta tabular-nums">
                            {formatItemSummaryMeta(item)}
                          </span>
                        </div>
                        <div className="log-ai-item-card__actions">
                          <span
                            className={`log-ai-confidence log-ai-confidence--${item.confidence}`}
                          >
                            {CONFIDENCE_LABELS[item.confidence]}
                          </span>
                          <div className="log-ai-item-card__action-buttons">
                            <button
                              type="button"
                              className="log-ai-item-card__details-btn"
                              aria-expanded={expanded}
                              onClick={() => toggleItemExpanded(item.id)}
                            >
                              {expanded ? '收起' : '调整'}
                            </button>
                            <RecordDeleteButton
                              label={`删除 ${itemLabel}`}
                              disabled={busy}
                              className="log-ai-item-card__delete-btn"
                              onClick={() => requestRemoveItem(item.id, itemLabel)}
                            />
                          </div>
                        </div>
                      </div>

                      {expanded ? (
                        <div className="log-ai-item-card__details">
                          <p className="log-ai-item-card__reason">
                            AI 估算依据：{item.reason}
                          </p>

                          <div className="log-ai-item-card__edit">
                            <p className="log-ai-item-card__edit-hint">
                              可以在保存前调整名称、份量、单位和热量。
                            </p>

                            <div className="log-ai-item-card__fields">
                              <label className="log-ai-item-card__field log-ai-item-card__field--name">
                                <span className="log-ai-item-card__field-label">名称</span>
                                <input
                                  value={item.name}
                                  onChange={(e) =>
                                    updateItem(item.id, { name: e.target.value })
                                  }
                                  disabled={busy}
                                  className="input w-full min-w-0"
                                  aria-label="名称"
                                />
                              </label>
                              <div className="log-ai-item-card__field-row log-ai-item-card__field-row--metrics">
                                <label className="log-ai-item-card__field">
                                  <span className="log-ai-item-card__field-label">
                                    数量
                                  </span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={item.quantityInput}
                                    onChange={(e) =>
                                      updateItem(item.id, {
                                        quantityInput: e.target.value,
                                      })
                                    }
                                    disabled={busy}
                                    className="input w-full min-w-0 tabular-nums"
                                    aria-label={`${itemLabel} 数量`}
                                  />
                                </label>
                                <label className="log-ai-item-card__field">
                                  <span className="log-ai-item-card__field-label">
                                    单位
                                  </span>
                                  <input
                                    value={item.unit}
                                    onChange={(e) =>
                                      updateItem(item.id, { unit: e.target.value })
                                    }
                                    disabled={busy}
                                    className="input w-full min-w-0"
                                    aria-label={`${itemLabel} 单位`}
                                  />
                                </label>
                                <label className="log-ai-item-card__field">
                                  <span className="log-ai-item-card__field-label">
                                    热量 (kcal)
                                  </span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={item.kcalInput}
                                    onChange={(e) =>
                                      updateItem(item.id, { kcalInput: e.target.value })
                                    }
                                    disabled={busy}
                                    className="input w-full min-w-0 tabular-nums"
                                    aria-label={`${itemLabel} 热量`}
                                  />
                                </label>
                              </div>
                            </div>
                          </div>

                          <label className="log-ai-item-card__template-option">
                            <input
                              type="checkbox"
                              aria-label="保存为快捷模板"
                              checked={item.saveAsTemplate}
                              onChange={(e) =>
                                updateItem(item.id, {
                                  saveAsTemplate: e.target.checked,
                                })
                              }
                              disabled={busy}
                            />
                            <span className="log-ai-item-card__template-copy">
                              <strong className="log-ai-item-card__template-title">
                                保存为快捷模板
                              </strong>
                              <span className="log-ai-item-card__template-desc">
                                下次可直接点选，系统会按数量自动计算热量。
                              </span>
                            </span>
                          </label>

                          {item.confidence === 'low' && item.saveAsTemplate ? (
                            <p className="log-ai-item-card__template-warning">
                              份量较模糊，保存为模板前建议确认单位和数量。
                            </p>
                          ) : null}

                          <button
                            type="button"
                            className="log-ai-item-card__remove-link"
                            disabled={busy}
                            onClick={() => requestRemoveItem(item.id, itemLabel)}
                          >
                            移除此条记录
                          </button>
                        </div>
                      ) : null}
                    </article>
                  )
                })}
              </div>
            ) : (
              <div className="log-ai-results__empty">
                <p className="log-ai-results__empty-title">没有要保存的条目了</p>
                <p className="log-ai-results__empty-hint">
                  可以重新拍照或输入描述，再次估算。
                </p>
              </div>
            )}

            <footer className="log-ai-results__footer">
              {saveError ? (
                <p className="text-sm text-red-400">{saveError}</p>
              ) : null}
              <button
                type="button"
                disabled={busy || items.length === 0}
                onClick={() => void handleSave()}
                className="btn-primary w-full py-3 disabled:opacity-50"
              >
                {saving
                  ? '保存中…'
                  : items.length === 0
                    ? '请先保留至少一条'
                    : `保存 ${items.length} 条记录`}
              </button>
            </footer>
          </section>
        ) : null}
      </div>
    </section>
    </>
  )
}

// TODO: image modality when backend supports photo-based AI estimate

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
  saving: boolean
  onSave: (items: AiEstimateItemState[]) => Promise<string | null>
  onAiOutcome?: (outcome: 'success' | 'timeout' | 'error') => void
  disabled?: boolean
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

const AI_EXAMPLES: Record<'exercise' | 'meal', string[]> = {
  meal: [
    '一碗牛肉面',
    '今天吃了点烧烤',
    '半杯奶茶',
    '鸡胸肉 150g',
    '一个鸡蛋',
    '一盘炒饭',
  ],
  exercise: [
    '慢跑 40 分钟',
    '力量训练一小时',
    '骑车半小时',
    '散步一会儿',
    '跳绳 10 分钟',
    '瑜伽 30 分钟',
  ],
}

const AI_EXAMPLES_LABEL: Record<'exercise' | 'meal', string> = {
  meal: '试试这样说：',
  exercise: '可以这样描述：',
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
  saving,
  onSave,
  onAiOutcome,
  disabled,
}: AiLogSectionProps) {
  const [description, setDescription] = useState('')
  const [items, setItems] = useState<AiEstimateItemState[]>([])
  const [estimating, setEstimating] = useState(false)
  const [estimateError, setEstimateError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [hasEstimate, setHasEstimate] = useState(false)

  const isExercise = kind === 'exercise'
  const sectionTitle = isExercise ? '做了什么运动？' : '吃了什么？'
  const sectionHint = isExercise
    ? '不用精确到数据，描述运动和时长就可以。'
    : '不用精确到克数，像聊天一样描述也可以。'
  const placeholder = isExercise
    ? '例如：慢跑 40 分钟 + 拉伸 10 分钟'
    : '例如：一碗牛肉面 + 一个鸡蛋'
  const examplesLabel = AI_EXAMPLES_LABEL[kind]

  const busy = disabled || saving || estimating

  const updateItem = (
    id: string,
    patch: Partial<AiEstimateItemState>,
  ) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    )
  }

  const handleEstimate = async () => {
    const desc = description.trim()
    if (desc.length < 2) {
      setEstimateError('请先输入内容（可含时长、分量，估算更准）')
      return
    }
    setEstimating(true)
    setEstimateError('')
    setHasEstimate(false)
    setItems([])

    const started = performance.now()
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), 35_000)

    try {
      const response = await httpData.estimateKcal(kind, desc, {
        signal: controller.signal,
      })
      setItems(mapResponseItems(desc, kind, response))
      setHasEstimate(true)
      onAiOutcome?.('success')
      const durationMs = Math.round(performance.now() - started)
      trackMetric({
        name: 'ai_estimate_success',
        durationMs,
        metadata: {
          kind,
          input_mode: 'ai',
          input_length: desc.length,
          duration_ms: durationMs,
          status: 'ok',
        },
      })
    } catch (err) {
      const durationMs = Math.round(performance.now() - started)
      if (err instanceof Error && err.name === 'AbortError') {
        setEstimateError('估算超时，请稍后重试')
        onAiOutcome?.('timeout')
        trackMetric({
          name: 'ai_estimate_timeout',
          durationMs,
          metadata: {
            kind,
            input_mode: 'ai',
            input_length: desc.length,
            duration_ms: durationMs,
            status: 'timeout',
            error_type: 'timeout',
          },
        })
      } else {
        setEstimateError(err instanceof Error ? err.message : '估算失败')
        onAiOutcome?.('error')
        trackMetric({
          name: 'ai_estimate_error',
          durationMs,
          metadata: {
            kind,
            input_mode: 'ai',
            input_length: desc.length,
            duration_ms: durationMs,
            status: 'error',
            error_type: classifyErrorType(err),
          },
        })
      }
    } finally {
      window.clearTimeout(timeoutId)
      setEstimating(false)
    }
  }

  const handleSave = async () => {
    const validated = validateAiItems(items)
    if (!validated.ok) {
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
    <section aria-label="AI 估算" className="log-ai-section">
      <div className="log-ai-card px-4 py-4">
        <header className="log-ai-card__header">
          <h2 className="log-section-title">{sectionTitle}</h2>
          <p className="log-ai-card__hint">{sectionHint}</p>
        </header>

        <label className="block">
          <input
            value={description}
            onChange={(e) => {
              setDescription(e.target.value)
              setEstimateError('')
            }}
            disabled={busy}
            className="input w-full min-w-0"
            placeholder={placeholder}
          />
        </label>

        <div className="log-ai-examples">
          <p className="log-ai-examples__label">{examplesLabel}</p>
          <div className="log-ai-examples__chips">
            {AI_EXAMPLES[kind].map((example) => (
              <button
                key={example}
                type="button"
                disabled={busy}
                aria-label={`使用示例：${example}`}
                className="log-ai-example-chip"
                onClick={() => {
                  setDescription(example)
                  setEstimateError('')
                }}
              >
                {example}
              </button>
            ))}
          </div>
        </div>

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

        {hasEstimate ? (
          <section aria-label="AI 估算结果" className="log-ai-results">
            <header className="log-ai-results__header">
              <h3 className="log-ai-results__title">AI 估算结果</h3>
              <p className="log-ai-results__hint">
                结果仅供参考，份量不明确时可以手动调整。
              </p>
            </header>

            <div className="log-ai-results__list">
              {items.map((item) => (
                <article key={item.id} className="log-ai-item-card">
                  <div className="log-ai-item-card__summary">
                    <div className="log-ai-item-card__summary-main">
                      <strong className="log-ai-item-card__title">
                        {item.name.trim() || '未命名'}
                      </strong>
                      <span className="log-ai-item-card__meta tabular-nums">
                        {formatItemSummaryMeta(item)}
                      </span>
                    </div>
                    <span
                      className={`log-ai-confidence log-ai-confidence--${item.confidence}`}
                    >
                      {CONFIDENCE_LABELS[item.confidence]}
                    </span>
                  </div>

                  <p className="log-ai-item-card__reason">
                    AI 估算依据：{item.reason}
                  </p>

                  <div className="log-ai-item-card__edit">
                    <p className="log-ai-item-card__edit-hint">
                      想调整？可以修改下面的数值。
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
                            aria-label={`${item.name} 数量`}
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
                            aria-label={`${item.name} 单位`}
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
                            aria-label={`${item.name} 热量`}
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
                </article>
              ))}
            </div>

            <footer className="log-ai-results__footer">
              {saveError ? (
                <p className="text-sm text-red-400">{saveError}</p>
              ) : null}
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleSave()}
                className="btn-primary w-full py-3 disabled:opacity-50"
              >
                {saving ? '保存中…' : '保存本次记录'}
              </button>
            </footer>
          </section>
        ) : null}
      </div>
    </section>
  )
}

import { useState } from 'react'
import { httpData } from '../lib/api'
import { trackEvent } from '../lib/telemetry'

interface AiKcalEstimateProps {
  kind: 'exercise' | 'meal'
  name: string
  onNameChange: (value: string) => void
  onEstimated: (kcal: number) => void
  disabled?: boolean
  placeholder?: string
}

export function AiKcalEstimate({
  kind,
  name,
  onNameChange,
  onEstimated,
  disabled,
  placeholder,
}: AiKcalEstimateProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastKcal, setLastKcal] = useState<number | null>(null)

  const isExercise = kind === 'exercise'
  const defaultPlaceholder = isExercise
    ? '例如：慢跑 40 分钟'
    : '例如：鸡胸肉 150g、一碗牛肉面'

  const handleEstimate = async () => {
    const desc = name.trim()
    if (desc.length < 2) {
      setError('请先填写名称（可含时长、分量，估算更准）')
      return
    }
    setLoading(true)
    setError('')
    setLastKcal(null)

    const started = performance.now()
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), 35_000)

    try {
      const { kcal } = await httpData.estimateKcal(kind, desc, {
        signal: controller.signal,
      })
      setLastKcal(kcal)
      onEstimated(kcal)
      trackEvent({
        name: 'ai_estimate_success',
        durationMs: Math.round(performance.now() - started),
        metadata: { kind },
      })
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('估算超时，请稍后重试')
        trackEvent({
          name: 'ai_estimate_timeout',
          durationMs: Math.round(performance.now() - started),
          metadata: { kind },
        })
      } else {
        setError(err instanceof Error ? err.message : '估算失败')
        trackEvent({
          name: 'ai_estimate_error',
          durationMs: Math.round(performance.now() - started),
          metadata: {
            kind,
            error: err instanceof Error ? err.message.slice(0, 120) : 'unknown',
          },
        })
      }
    } finally {
      window.clearTimeout(timeoutId)
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-violet-500/25 bg-violet-950/20 px-4 py-4 ring-1 ring-violet-500/15">
      <label className="block">
        <span className="text-sm text-muted">名称</span>
        <input
          value={name}
          onChange={(e) => {
            onNameChange(e.target.value)
            setError('')
          }}
          disabled={disabled || loading}
          className="input mt-1 w-full"
          placeholder={placeholder ?? defaultPlaceholder}
          required
        />
      </label>
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => void handleEstimate()}
        className="mt-3 w-full rounded-xl bg-violet-700/85 py-3 text-sm font-medium text-violet-50 transition hover:bg-violet-600/90 disabled:opacity-50"
      >
        {loading ? '估算中…' : 'AI 估算 kcal'}
      </button>
      <p className="mt-2 text-xs leading-relaxed text-muted">
        {isExercise
          ? '填写运动名称后可直接保存；需要辅助时点「AI 估算」自动填入热量。'
          : '填写食物名称后可直接保存；需要辅助时点「AI 估算」自动填入热量。'}
      </p>
      {lastKcal != null && !error && (
        <p className="mt-2 text-sm text-emerald-300/95">
          估算约{' '}
          <span className="font-bold tabular-nums text-emerald-300">{lastKcal}</span>{' '}
          kcal，已填入下方（可再改）
        </p>
      )}
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  )
}

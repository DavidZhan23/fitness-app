import { useState } from 'react'
import { httpData } from '../lib/api'

interface AiKcalEstimateProps {
  kind: 'exercise' | 'meal'
  /** 名称栏已填时可作为补充上下文 */
  name: string
  onEstimated: (kcal: number) => void
  disabled?: boolean
}

export function AiKcalEstimate({
  kind,
  name,
  onEstimated,
  disabled,
}: AiKcalEstimateProps) {
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastKcal, setLastKcal] = useState<number | null>(null)

  const isExercise = kind === 'exercise'

  const handleEstimate = async () => {
    const desc = description.trim() || name.trim()
    if (desc.length < 2) {
      setError('请先填写描述，或填写上方的名称')
      return
    }
    setLoading(true)
    setError('')
    setLastKcal(null)

    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), 35_000)

    try {
      const { kcal } = await httpData.estimateKcal(kind, desc, {
        signal: controller.signal,
      })
      setLastKcal(kcal)
      onEstimated(kcal)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('估算超时，请稍后重试')
      } else {
        setError(err instanceof Error ? err.message : '估算失败')
      }
    } finally {
      window.clearTimeout(timeoutId)
      setLoading(false)
    }
  }

  return (
    <section className="rounded-xl border border-violet-500/25 bg-violet-950/25 px-3 py-3 ring-1 ring-violet-500/15">
      <p className="text-sm font-medium text-violet-200/95">AI 估算热量</p>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        {isExercise
          ? '描述运动内容、时长、强度，例如：慢跑 40 分钟'
          : '描述吃了什么、大概分量，例如：一碗牛肉面、中份'}
      </p>
      <label className="mt-2 block">
        <span className="sr-only">AI 描述</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={disabled || loading}
          rows={2}
          className="input mt-0 resize-none py-2 text-sm"
          placeholder={
            isExercise
              ? '跑步半小时，配速约 6 分/公里'
              : '午餐：黄焖鸡米饭一份，少汤'
          }
        />
      </label>
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => void handleEstimate()}
        className="mt-2 w-full rounded-lg bg-violet-700/80 py-2 text-sm font-medium text-violet-50 transition hover:bg-violet-600/90 disabled:opacity-50"
      >
        {loading ? '估算中…' : 'AI 估算 kcal'}
      </button>
      {lastKcal != null && !error && (
        <p className="mt-2 text-center text-sm text-emerald-300/95">
          估算结果：
          <span className="ml-1 text-lg font-bold tabular-nums text-emerald-300">
            {lastKcal}
          </span>{' '}
          kcal（已填入下方，可再改）
        </p>
      )}
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </section>
  )
}

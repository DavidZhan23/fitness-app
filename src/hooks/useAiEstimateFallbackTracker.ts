import { useEffect, useRef } from 'react'
import { trackMetric, type TelemetryMetadata } from '../lib/telemetry'

type InputMode = NonNullable<TelemetryMetadata['input_mode']>
type Outcome = 'success' | 'timeout' | 'error'
type Kind = 'exercise' | 'meal'

export function useAiEstimateFallbackTracker() {
  const openedAt = useRef(0)
  const pendingFallback = useRef(false)
  const lastInputMode = useRef<InputMode>('manual')

  useEffect(() => {
    openedAt.current = performance.now()
  }, [])

  const markTemplateInput = () => {
    lastInputMode.current = 'template'
  }

  const markManualInput = () => {
    lastInputMode.current = 'manual'
  }

  const markAiOutcome = (outcome: Outcome) => {
    if (outcome === 'success') {
      pendingFallback.current = false
      lastInputMode.current = 'ai'
      return
    }
    pendingFallback.current = true
    lastInputMode.current = 'manual'
  }

  const recordSavedIfPending = (kind: Kind) => {
    if (!pendingFallback.current) return
    const durationMs = Math.round(performance.now() - openedAt.current)
    trackMetric({
      name: 'ai_estimate_fallback_complete',
      durationMs,
      metadata: {
        kind,
        input_mode: lastInputMode.current,
        duration_ms: durationMs,
        status: 'saved',
      },
    })
    pendingFallback.current = false
  }

  return {
    markTemplateInput,
    markManualInput,
    markAiOutcome,
    recordSavedIfPending,
  }
}

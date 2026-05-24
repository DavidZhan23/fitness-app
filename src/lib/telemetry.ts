import { httpData } from './api'
import { getStoredToken } from './api/http'
import { isBackendConfigured } from './config'

export type TelemetryEventName =
  | 'page_load'
  | 'route_change'
  | 'ai_estimate_success'
  | 'ai_estimate_timeout'
  | 'ai_estimate_error'
  | 'log_save_success'
  | 'log_save_failure'

export type TelemetryPayload = {
  name: TelemetryEventName
  route?: string
  durationMs?: number
  metadata?: Record<string, unknown>
  clientAt?: string
}

const FLUSH_INTERVAL_MS = 5_000
const MAX_BATCH = 20

const queue: TelemetryPayload[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null
let bootTracked = false

function scheduleFlush() {
  if (flushTimer != null) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    void flushTelemetry()
  }, FLUSH_INTERVAL_MS)
}

export function trackEvent(payload: TelemetryPayload) {
  if (!isBackendConfigured) return
  if (!getStoredToken()) return
  queue.push({
    ...payload,
    clientAt: payload.clientAt ?? new Date().toISOString(),
  })
  if (queue.length >= MAX_BATCH) {
    void flushTelemetry()
    return
  }
  scheduleFlush()
}

export async function flushTelemetry(force = false) {
  if (!isBackendConfigured || queue.length === 0) return
  if (!getStoredToken()) {
    queue.length = 0
    return
  }
  if (flushTimer != null) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  const batch = queue.splice(0, MAX_BATCH)
  try {
    await httpData.ingestTelemetryEvents(batch)
  } catch {
    if (force) return
    queue.unshift(...batch)
    scheduleFlush()
  }
}

export function trackInitialPageLoad(route: string) {
  if (bootTracked) return
  bootTracked = true

  const nav = performance.getEntriesByType('navigation')[0] as
    | PerformanceNavigationTiming
    | undefined
  const durationMs = Math.round(
    nav?.domContentLoadedEventEnd && nav.startTime >= 0
      ? nav.domContentLoadedEventEnd - nav.startTime
      : performance.now(),
  )

  trackEvent({
    name: 'page_load',
    route,
    durationMs,
  })
}

export function trackRouteChange(
  from: string,
  to: string,
  durationMs: number,
) {
  trackEvent({
    name: 'route_change',
    route: to,
    durationMs: Math.max(0, Math.round(durationMs)),
    metadata: { from, to },
  })
}

if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      void flushTelemetry(true)
    }
  })
  window.addEventListener('pagehide', () => {
    void flushTelemetry(true)
  })
}

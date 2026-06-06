import { apiBaseUrl, isBackendConfigured } from './config'
import { getStoredToken } from './api/http'

export type TelemetryEventName =
  | 'page_load'
  | 'route_change'
  | 'ai_estimate_success'
  | 'ai_estimate_timeout'
  | 'ai_estimate_error'
  | 'ai_estimate_fallback_complete'

const EVENT_NAMES: ReadonlySet<TelemetryEventName> = new Set<TelemetryEventName>([
  'page_load',
  'route_change',
  'ai_estimate_success',
  'ai_estimate_timeout',
  'ai_estimate_error',
  'ai_estimate_fallback_complete',
])

/**
 * metadata 字段白名单。任何不在表内的字段在 trackMetric 入口被静默丢弃，
 * 后端 normalizeEvent 还会再 pick 一次。绝不允许塞用户原文（饮食 / 体重 / 备注）。
 */
const ALLOWED_METADATA_KEYS = [
  'input_length',
  'input_mode',
  'route_from',
  'route_to',
  'duration_ms',
  'status',
  'error_type',
  'kind',
] as const

type AllowedMetadataKey = (typeof ALLOWED_METADATA_KEYS)[number]
const ALLOWED_METADATA_SET = new Set<string>(ALLOWED_METADATA_KEYS)

export type TelemetryMetadata = Partial<{
  input_length: number
  input_mode: 'ai' | 'photo' | 'manual' | 'template' | 'default_estimate'
  route_from: string
  route_to: string
  duration_ms: number
  status: 'ok' | 'error' | 'timeout' | 'saved'
  error_type: 'timeout' | 'error' | 'network' | 'parse'
  kind: 'exercise' | 'meal'
}>

export type TelemetryPayload = {
  name: TelemetryEventName
  route?: string
  durationMs?: number
  metadata?: TelemetryMetadata
  clientAt?: string
}

type QueuedEvent = {
  name: TelemetryEventName
  route?: string
  durationMs?: number
  metadata?: TelemetryMetadata
  clientAt: string
  sessionId: string
  appVersion: string
  commitSha: string
}

const FLUSH_INTERVAL_MS = 5_000
const MAX_BATCH = 20
const SESSION_STORAGE_KEY = 'fitness_telemetry_session_id'

const queue: QueuedEvent[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null
let bootTracked = false

function isTelemetryDisabled(): boolean {
  try {
    return import.meta.env?.VITE_TELEMETRY_DISABLED === '1'
  } catch {
    return false
  }
}

function getAppVersion(): string {
  try {
    return String(import.meta.env?.VITE_APP_VERSION ?? '').slice(0, 32)
  } catch {
    return ''
  }
}

function getCommitSha(): string {
  try {
    return String(import.meta.env?.VITE_COMMIT_SHA ?? '').slice(0, 64)
  } catch {
    return ''
  }
}

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return ''
  try {
    const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (existing && existing.length > 0) return existing
    const next = `s-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 10)}`
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, next)
    return next
  } catch {
    return ''
  }
}

function sanitizeMetadata(
  raw: TelemetryMetadata | undefined,
): TelemetryMetadata | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const picked: Record<string, unknown> = {}
  for (const key of Object.keys(raw)) {
    if (!ALLOWED_METADATA_SET.has(key)) continue
    const value = (raw as Record<string, unknown>)[key]
    if (value == null) continue
    if (typeof value === 'string' && value.length > 200) continue
    picked[key as AllowedMetadataKey] = value
  }
  return Object.keys(picked).length > 0
    ? (picked as TelemetryMetadata)
    : undefined
}

function scheduleFlush() {
  if (flushTimer != null) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    void flushTelemetry()
  }, FLUSH_INTERVAL_MS)
}

function buildBody(events: QueuedEvent[]) {
  return JSON.stringify({ events })
}

function trySendBeacon(events: QueuedEvent[]): boolean {
  if (typeof navigator === 'undefined' || !navigator.sendBeacon) return false
  try {
    const url = `${apiBaseUrl}/telemetry/events`
    const blob = new Blob([buildBody(events)], { type: 'application/json' })
    return navigator.sendBeacon(url, blob)
  } catch {
    return false
  }
}

async function postWithFetch(events: QueuedEvent[]): Promise<void> {
  const token = getStoredToken()
  if (!token) return
  await fetch(`${apiBaseUrl}/telemetry/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: buildBody(events),
    keepalive: true,
  })
}

/**
 * 通用埋点入口（"trackMetric"）。失败 fire-and-forget，不抛错，不阻塞主流程。
 * 注意：metadata 在此处即按白名单 pick 一次；任何不在白名单内的字段被静默丢弃。
 */
export function trackMetric(payload: TelemetryPayload) {
  if (isTelemetryDisabled()) return
  if (!isBackendConfigured) return
  if (!EVENT_NAMES.has(payload.name)) return
  if (!getStoredToken()) return

  const metadata = sanitizeMetadata(payload.metadata)

  queue.push({
    name: payload.name,
    route: payload.route,
    durationMs:
      typeof payload.durationMs === 'number' && Number.isFinite(payload.durationMs)
        ? Math.max(0, Math.round(payload.durationMs))
        : undefined,
    metadata,
    clientAt: payload.clientAt ?? new Date().toISOString(),
    sessionId: getOrCreateSessionId(),
    appVersion: getAppVersion(),
    commitSha: getCommitSha(),
  })

  if (queue.length >= MAX_BATCH) {
    void flushTelemetry()
    return
  }
  scheduleFlush()
}

/** 向后兼容旧名称；与 `trackMetric` 行为完全一致。 */
export const trackEvent = trackMetric

export async function flushTelemetry(force = false) {
  if (isTelemetryDisabled()) return
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

  if (force && trySendBeacon(batch)) return

  try {
    await postWithFetch(batch)
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

  trackMetric({
    name: 'page_load',
    route,
    durationMs,
    metadata: { duration_ms: durationMs, status: 'ok' },
  })
}

export function trackRouteChange(
  from: string,
  to: string,
  durationMs: number,
) {
  const rounded = Math.max(0, Math.round(durationMs))
  trackMetric({
    name: 'route_change',
    route: to,
    durationMs: rounded,
    metadata: { route_from: from, route_to: to, duration_ms: rounded },
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

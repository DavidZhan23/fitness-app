import { query } from './db.js'

/**
 * 前端可用事件名白名单。
 * 服务端旧事件 `ai_estimate_server_*` 与保存类 `log_save_*` 在 Phase 1b
 * 已收紧移除；如需服务端 AI 耗时观测，另立 milestone。
 * @type {ReadonlySet<string>}
 */
export const TELEMETRY_EVENT_NAMES = new Set([
  'page_load',
  'route_change',
  'ai_estimate_success',
  'ai_estimate_timeout',
  'ai_estimate_error',
  'ai_estimate_fallback_complete',
])

/**
 * metadata 字段白名单：前端 trackMetric 已 pick 一次；后端再 pick 一次兜底。
 * 任何 PII（饮食原文、体重、身体数据、备注等）一律不允许进入。
 */
const ALLOWED_METADATA_KEYS = new Set([
  'input_length',
  'input_mode',
  'route_from',
  'route_to',
  'duration_ms',
  'status',
  'error_type',
  'kind',
])

function pickMetadata(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const picked = {}
  for (const key of Object.keys(raw)) {
    if (!ALLOWED_METADATA_KEYS.has(key)) continue
    const value = raw[key]
    if (value == null) continue
    if (typeof value === 'string' && value.length > 200) continue
    picked[key] = value
  }
  return Object.keys(picked).length > 0 ? picked : null
}

/**
 * @param {Array<{
 *   name: string
 *   route?: string | null
 *   durationMs?: number | null
 *   metadata?: Record<string, unknown> | null
 *   clientAt?: string | null
 *   sessionId?: string | null
 *   appVersion?: string | null
 *   commitSha?: string | null
 * }>} events
 * @param {string | null | undefined} userId
 */
export async function insertTelemetryEvents(events, userId) {
  if (!events.length) return { inserted: 0 }

  const rows = events.filter((e) => TELEMETRY_EVENT_NAMES.has(e.name))
  if (!rows.length) return { inserted: 0 }

  const values = []
  const params = []
  let i = 1
  for (const event of rows) {
    const metadata = pickMetadata(event.metadata)
    values.push(
      `($${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++})`,
    )
    params.push(
      userId ?? null,
      event.name,
      event.route ?? null,
      event.durationMs ?? null,
      metadata ? JSON.stringify(metadata) : null,
      event.clientAt ?? null,
      event.sessionId ?? null,
      event.appVersion ?? null,
      event.commitSha ?? null,
    )
  }

  await query(
    `insert into telemetry_events
       (user_id, event_name, route_path, duration_ms, metadata, client_at,
        session_id, app_version, commit_sha)
     values ${values.join(', ')}`,
    params,
  )

  return { inserted: rows.length }
}

export { ALLOWED_METADATA_KEYS, pickMetadata }

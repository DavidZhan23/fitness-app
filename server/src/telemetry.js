import { query } from './db.js'

/** @type {ReadonlySet<string>} */
export const TELEMETRY_EVENT_NAMES = new Set([
  'page_load',
  'route_change',
  'ai_estimate_success',
  'ai_estimate_timeout',
  'ai_estimate_error',
  'ai_estimate_server_ok',
  'ai_estimate_server_fail',
  'log_save_success',
  'log_save_failure',
])

/**
 * @param {Array<{
 *   name: string
 *   route?: string | null
 *   durationMs?: number | null
 *   metadata?: Record<string, unknown> | null
 *   clientAt?: string | null
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
    values.push(
      `($${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++})`,
    )
    params.push(
      userId ?? null,
      event.name,
      event.route ?? null,
      event.durationMs ?? null,
      event.metadata ? JSON.stringify(event.metadata) : null,
      event.clientAt ?? null,
    )
  }

  await query(
    `insert into telemetry_events
       (user_id, event_name, route_path, duration_ms, metadata, client_at)
     values ${values.join(', ')}`,
    params,
  )

  return { inserted: rows.length }
}

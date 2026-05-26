import { Router } from 'express'
import { asyncHandler } from '../asyncHandler.js'
import { authMiddleware, requireDeveloper } from '../auth.js'
import {
  insertTelemetryEvents,
  TELEMETRY_EVENT_NAMES,
  pickMetadata,
} from '../telemetry.js'
import { generateWeeklyReport } from '../weeklyReport.js'
import { query } from '../db.js'

const router = Router()

function pickShortString(value, max = 200) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.length <= max ? trimmed : null
}

function normalizeEvent(raw) {
  if (!raw || typeof raw !== 'object') return null
  const name = typeof raw.name === 'string' ? raw.name.trim() : ''
  if (!TELEMETRY_EVENT_NAMES.has(name)) return null

  const durationMs =
    typeof raw.durationMs === 'number' && Number.isFinite(raw.durationMs)
      ? Math.max(0, Math.round(raw.durationMs))
      : null

  const route = pickShortString(raw.route, 200)

  let clientAt = null
  if (typeof raw.clientAt === 'string' && raw.clientAt.length <= 40) {
    const parsed = new Date(raw.clientAt)
    if (!Number.isNaN(parsed.getTime())) {
      clientAt = parsed.toISOString()
    }
  }

  const metadata = pickMetadata(raw.metadata)

  return {
    name,
    route,
    durationMs,
    metadata,
    clientAt,
    sessionId: pickShortString(raw.sessionId, 64),
    appVersion: pickShortString(raw.appVersion, 32),
    commitSha: pickShortString(raw.commitSha, 64),
  }
}

router.post(
  '/telemetry/events',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const events = Array.isArray(req.body?.events) ? req.body.events : []
    if (events.length === 0) {
      return res.status(400).json({ error: 'events 不能为空' })
    }
    if (events.length > 20) {
      return res.status(400).json({ error: '单次最多 20 条事件' })
    }

    const normalized = events.map(normalizeEvent).filter(Boolean)
    const data = await insertTelemetryEvents(normalized, req.userId)
    res.json(data)
  }),
)

// ─── Developer: weekly reports ────────────────────────────────────

router.get(
  '/telemetry/weekly-reports',
  authMiddleware,
  requireDeveloper,
  asyncHandler(async (_req, res) => {
    const { rows } = await query(
      `select week_id, week_start_date, week_end_date, status, generated_by,
              report_path, created_at, updated_at
       from weekly_reports
       order by week_id desc
       limit 52`,
    )
    res.json({ reports: rows })
  }),
)

router.get(
  '/telemetry/weekly-reports/:week',
  authMiddleware,
  requireDeveloper,
  asyncHandler(async (req, res) => {
    const { week } = req.params
    if (!/^\d{4}-W\d{2}$/.test(week)) {
      return res.status(400).json({ error: 'week 格式应为 YYYY-Www，例如 2026-W22' })
    }
    const { rows } = await query(
      `select * from weekly_reports where week_id = $1`,
      [week],
    )
    if (rows.length === 0) {
      return res.status(404).json({ error: `${week} 周报不存在，可先 POST regenerate` })
    }
    res.json(rows[0])
  }),
)

router.post(
  '/telemetry/weekly-reports/:week/regenerate',
  authMiddleware,
  requireDeveloper,
  asyncHandler(async (req, res) => {
    const { week } = req.params
    if (!/^\d{4}-W\d{2}$/.test(week)) {
      return res.status(400).json({ error: 'week 格式应为 YYYY-Www，例如 2026-W22' })
    }
    const result = await generateWeeklyReport(week, query, {
      force: true,
      generatedBy: 'manual',
    })
    res.json({ ok: true, ...result })
  }),
)

export default router

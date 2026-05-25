import { Router } from 'express'
import { asyncHandler } from '../asyncHandler.js'
import { authMiddleware } from '../auth.js'
import {
  insertTelemetryEvents,
  TELEMETRY_EVENT_NAMES,
  pickMetadata,
} from '../telemetry.js'

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

export default router

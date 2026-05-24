import { Router } from 'express'
import { asyncHandler } from '../asyncHandler.js'
import { authMiddleware } from '../auth.js'
import { insertTelemetryEvents, TELEMETRY_EVENT_NAMES } from '../telemetry.js'

const router = Router()

function normalizeEvent(raw) {
  if (!raw || typeof raw !== 'object') return null
  const name = typeof raw.name === 'string' ? raw.name.trim() : ''
  if (!TELEMETRY_EVENT_NAMES.has(name)) return null

  const durationMs =
    typeof raw.durationMs === 'number' && Number.isFinite(raw.durationMs)
      ? Math.max(0, Math.round(raw.durationMs))
      : null

  const route =
    typeof raw.route === 'string' && raw.route.length <= 200
      ? raw.route
      : null

  let clientAt = null
  if (typeof raw.clientAt === 'string' && raw.clientAt.length <= 40) {
    const parsed = new Date(raw.clientAt)
    if (!Number.isNaN(parsed.getTime())) {
      clientAt = parsed.toISOString()
    }
  }

  let metadata = null
  if (raw.metadata && typeof raw.metadata === 'object' && !Array.isArray(raw.metadata)) {
    metadata = raw.metadata
  }

  return { name, route, durationMs, metadata, clientAt }
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

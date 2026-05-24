import { Router } from 'express'
import { asyncHandler } from '../asyncHandler.js'
import { authMiddleware } from '../auth.js'
import { query } from '../db.js'
import { estimateKcalFromDescription } from '../deepseekKcal.js'
import { insertTelemetryEvents } from '../telemetry.js'

const router = Router()

async function writeAiTelemetry(event, userId) {
  try {
    await insertTelemetryEvents([event], userId)
  } catch {
    /* 遥测失败不影响主流程 */
  }
}

router.post(
  '/ai/estimate-kcal',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { type, description } = req.body
    if (type !== 'exercise' && type !== 'meal') {
      return res.status(400).json({ error: 'type 须为 exercise 或 meal' })
    }
    const { rows } = await query(
      `select weight_kg from profiles where id = $1`,
      [req.userId],
    )
    const started = Date.now()
    try {
      const result = await estimateKcalFromDescription({
        type,
        description,
        profile: rows[0] || {},
      })
      await writeAiTelemetry(
        {
          name: 'ai_estimate_server_ok',
          durationMs: Date.now() - started,
          metadata: { type },
        },
        req.userId,
      )
      res.json(result)
    } catch (err) {
      await writeAiTelemetry(
        {
          name: 'ai_estimate_server_fail',
          durationMs: Date.now() - started,
          metadata: {
            type,
            error: err instanceof Error ? err.message.slice(0, 120) : 'unknown',
          },
        },
        req.userId,
      )
      throw err
    }
  }),
)

export default router

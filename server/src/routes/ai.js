import { Router } from 'express'
import { asyncHandler } from '../asyncHandler.js'
import { authMiddleware } from '../auth.js'
import { query } from '../db.js'
import { getKcalEstimator } from '../ai/registry.js'

const router = Router()

router.post(
  '/ai/estimate-kcal',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const estimator = getKcalEstimator()
    const { type, description } = req.body
    if (type !== 'exercise' && type !== 'meal') {
      return res.status(400).json({ error: 'type 须为 exercise 或 meal' })
    }
    const { rows } = await query(
      `select weight_kg from profiles where id = $1`,
      [req.userId],
    )
    const result = await estimator({
      kind: type,
      description,
      profile: rows[0] || {},
      modality: 'text',
    })
    res.json({ kcal: result.kcal })
  }),
)

export default router

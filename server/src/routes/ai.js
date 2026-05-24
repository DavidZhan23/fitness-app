import { Router } from 'express'
import { asyncHandler } from '../asyncHandler.js'
import { authMiddleware } from '../auth.js'
import { query } from '../db.js'
import { estimateKcalFromDescription } from '../deepseekKcal.js'

const router = Router()

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
    const result = await estimateKcalFromDescription({
      type,
      description,
      profile: rows[0] || {},
    })
    res.json(result)
  }),
)

export default router

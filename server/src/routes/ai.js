import { Router } from 'express'
import { asyncHandler } from '../asyncHandler.js'
import { authMiddleware } from '../auth.js'
import { query } from '../db.js'
import { getKcalEstimator, getKcalVisionEstimator } from '../ai/registry.js'
import { generateFoxEncouragement } from '../ai/providers/deepseekFox.js'
import { parseMealNutritionLabelFromImage } from '../ai/providers/qwenVision.js'
import { getWeeklyChampionSummary } from '../foxCompanion.js'
import {
  assertMealPhotoQuotaAvailable,
  getMealPhotoQuota,
  mealPhotoQuotaFromError,
  MEAL_PHOTO_DAILY_LIMIT,
  refundMealPhotoQuota,
  tryConsumeMealPhotoQuota,
} from '../mealPhotoQuota.js'

const router = Router()
const foxRequestTimes = new Map()
const FOX_SERVER_COOLDOWN_MS = 5_000

router.get(
  '/ai/fox-companion',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const summary = await getWeeklyChampionSummary(req.userId)
    res.json(summary)
  }),
)

router.post(
  '/ai/fox-encouragement',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const summary = await getWeeklyChampionSummary(req.userId)
    if (!summary.eligible) {
      return res.status(403).json({ error: '本周达成运动大王后，小狐狸才会出现' })
    }
    const now = Date.now()
    const trigger = req.body?.trigger
    const canBypass = trigger === 'goal_completed'
    const lastRequestAt = foxRequestTimes.get(req.userId) || 0
    const skipAi = !canBypass && now - lastRequestAt < FOX_SERVER_COOLDOWN_MS
    if (!skipAi) foxRequestTimes.set(req.userId, now)
    const result = await generateFoxEncouragement(summary, req.body, { skipAi })
    res.json(result)
  }),
)

router.get(
  '/ai/meal-photo-quota',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const quota = await getMealPhotoQuota(req.userId, req.userEmail)
    res.json(quota)
  }),
)

router.post(
  '/ai/estimate-kcal',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { type, description, modality, image, images } = req.body
    if (type !== 'exercise' && type !== 'meal') {
      return res.status(400).json({ error: 'type 须为 exercise 或 meal' })
    }

    const { rows } = await query(`select weight_kg from profiles where id = $1`, [
      req.userId,
    ])
    const profile = rows[0] || {}

    if (modality === 'image') {
      if (type !== 'meal') {
        return res.status(400).json({ error: '拍照识别仅支持饮食记录' })
      }

      const imageDataUrls = Array.isArray(images)
        ? images.filter((item) => typeof item === 'string' && item.trim())
        : typeof image === 'string' && image.trim()
          ? [image]
          : []
      const imageCount = Math.max(1, imageDataUrls.length)
      let consumed = false
      try {
        await assertMealPhotoQuotaAvailable(req.userId, req.userEmail, imageCount)
        consumed = await tryConsumeMealPhotoQuota(req.userId, req.userEmail, imageCount)
        if (!consumed) {
          const quota = await getMealPhotoQuota(req.userId, req.userEmail)
          return res.status(429).json({
            error: `今日拍照识别次数已用完（${MEAL_PHOTO_DAILY_LIMIT} 次/天），请明天再试`,
            mealPhotoQuota: quota,
          })
        }

        const visionEstimator = getKcalVisionEstimator()
        const result = await visionEstimator({
          kind: 'meal',
          description: typeof description === 'string' ? description : '',
          modality: 'image',
          imageDataUrls,
          profile,
        })
        const mealPhotoQuota = await getMealPhotoQuota(req.userId, req.userEmail)
        const body = { kcal: result.kcal, mealPhotoQuota }
        if (result.items?.length) body.items = result.items
        return res.json(body)
      } catch (err) {
        if (consumed) {
          await refundMealPhotoQuota(req.userId, req.userEmail, imageCount)
        }
        const quota = mealPhotoQuotaFromError(err)
        if (err.status === 429 && quota) {
          return res.status(429).json({
            error: err.message,
            mealPhotoQuota: quota,
          })
        }
        throw err
      }
    }

    const estimator = getKcalEstimator()
    const result = await estimator({
      kind: type,
      description,
      profile,
      modality: 'text',
    })
    const body = { kcal: result.kcal }
    if (result.items?.length) body.items = result.items
    res.json(body)
  }),
)

router.post(
  '/ai/parse-nutrition-label',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { image, images, description } = req.body
    const imageDataUrls = Array.isArray(images)
      ? images.filter((item) => typeof item === 'string' && item.trim())
      : typeof image === 'string' && image.trim()
        ? [image]
        : []
    const imageCount = Math.max(1, imageDataUrls.length)
    let consumed = false

    try {
      await assertMealPhotoQuotaAvailable(req.userId, req.userEmail, imageCount)
      consumed = await tryConsumeMealPhotoQuota(req.userId, req.userEmail, imageCount)
      if (!consumed) {
        const quota = await getMealPhotoQuota(req.userId, req.userEmail)
        return res.status(429).json({
          error: `今日拍照识别次数已用完（${MEAL_PHOTO_DAILY_LIMIT} 次/天），请明天再试`,
          mealPhotoQuota: quota,
        })
      }

      const result = await parseMealNutritionLabelFromImage({
        imageDataUrls,
        description: typeof description === 'string' ? description : '',
      })
      const mealPhotoQuota = await getMealPhotoQuota(req.userId, req.userEmail)
      res.json({ ...result, mealPhotoQuota })
    } catch (err) {
      if (consumed) {
        await refundMealPhotoQuota(req.userId, req.userEmail, imageCount)
      }
      const quota = mealPhotoQuotaFromError(err)
      if (err.status === 429 && quota) {
        return res.status(429).json({
          error: err.message,
          mealPhotoQuota: quota,
        })
      }
      throw err
    }
  }),
)

export default router

import { Router } from 'express'
import { asyncHandler } from '../asyncHandler.js'
import { authMiddleware } from '../auth.js'
import { query } from '../db.js'
import { getKcalEstimator, getKcalVisionEstimator } from '../ai/registry.js'
import { parseMealNutritionLabelFromImage } from '../ai/providers/qwenVision.js'
import {
  assertMealPhotoQuotaAvailable,
  getMealPhotoQuota,
  mealPhotoQuotaFromError,
  MEAL_PHOTO_DAILY_LIMIT,
  refundMealPhotoQuota,
  tryConsumeMealPhotoQuota,
} from '../mealPhotoQuota.js'

const router = Router()

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

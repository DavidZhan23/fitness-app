import { query } from './db.js'
import { formatDateKeyInTz } from './dateKey.js'
import { isDeveloperEmail } from './auth.js'

export const MEAL_PHOTO_DAILY_LIMIT = Math.max(
  1,
  Math.min(500, Number(process.env.MEAL_PHOTO_DAILY_LIMIT || 30) || 30),
)

/**
 * @typedef {Object} MealPhotoQuota
 * @property {number} limit
 * @property {number} used
 * @property {number|null} remaining null when unlimited
 * @property {boolean} unlimited
 * @property {string} dateKey
 */

/**
 * @param {string} userId
 * @param {string|undefined|null} userEmail
 * @returns {Promise<MealPhotoQuota>}
 */
export async function getMealPhotoQuota(userId, userEmail) {
  const dateKey = formatDateKeyInTz()
  const unlimited = isDeveloperEmail(userEmail)

  if (unlimited) {
    return {
      limit: MEAL_PHOTO_DAILY_LIMIT,
      used: 0,
      remaining: null,
      unlimited: true,
      dateKey,
    }
  }

  const { rows } = await query(
    `select use_count
     from meal_photo_daily_usage
     where user_id = $1 and usage_date = $2::date`,
    [userId, dateKey],
  )
  const used = Number(rows[0]?.use_count ?? 0)
  const remaining = Math.max(0, MEAL_PHOTO_DAILY_LIMIT - used)

  return {
    limit: MEAL_PHOTO_DAILY_LIMIT,
    used,
    remaining,
    unlimited: false,
    dateKey,
  }
}

/**
 * 原子占用一次配额；开发者始终成功且不写入。
 * @returns {Promise<boolean>}
 */
export async function tryConsumeMealPhotoQuota(userId, userEmail) {
  if (isDeveloperEmail(userEmail)) return true

  const dateKey = formatDateKeyInTz()
  const limit = MEAL_PHOTO_DAILY_LIMIT

  const inserted = await query(
    `insert into meal_photo_daily_usage (user_id, usage_date, use_count)
     values ($1, $2::date, 1)
     on conflict (user_id, usage_date)
     do update set use_count = meal_photo_daily_usage.use_count + 1
     where meal_photo_daily_usage.use_count < $3
     returning use_count`,
    [userId, dateKey, limit],
  )

  return inserted.rows.length > 0
}

/** AI 失败时退还已占用的一次（开发者无占用，直接 no-op） */
export async function refundMealPhotoQuota(userId, userEmail) {
  if (isDeveloperEmail(userEmail)) return

  const dateKey = formatDateKeyInTz()
  await query(
    `update meal_photo_daily_usage
     set use_count = greatest(0, use_count - 1)
     where user_id = $1 and usage_date = $2::date and use_count > 0`,
    [userId, dateKey],
  )
}

/**
 * @param {string} userId
 * @param {string|undefined|null} userEmail
 */
export async function assertMealPhotoQuotaAvailable(userId, userEmail) {
  const quota = await getMealPhotoQuota(userId, userEmail)
  if (quota.unlimited || (quota.remaining ?? 0) > 0) return quota

  const err = new Error(
    `今日拍照识别次数已用完（${MEAL_PHOTO_DAILY_LIMIT} 次/天），请明天再试`,
  )
  err.status = 429
  err.mealPhotoQuota = quota
  throw err
}

/**
 * @param {unknown} err
 * @returns {MealPhotoQuota|undefined}
 */
export function mealPhotoQuotaFromError(err) {
  if (err && typeof err === 'object' && 'mealPhotoQuota' in err) {
    return err.mealPhotoQuota
  }
  return undefined
}

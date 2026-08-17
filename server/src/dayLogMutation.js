import { syncCommunityVisibilityAfterLogChange } from './communityVisibility.js'
import { isCurrentLogDate } from './dateKey.js'
import { query } from './db.js'
import { scheduleMicronutrientRefresh } from './micronutrients.js'

async function logDateFromDayLogId(userId, dayLogId) {
  const { rows } = await query(
    `select log_date::text as log_date from day_logs where id = $1 and user_id = $2`,
    [dayLogId, userId],
  )
  return rows[0]?.log_date ?? null
}

async function logContextFromItemId(userId, itemId, table) {
  const sql =
    table === 'exercises'
      ? `select dl.id as day_log_id, dl.log_date::text as log_date
         from exercises e
         join day_logs dl on dl.id = e.day_log_id
         where e.id = $1 and e.user_id = $2`
      : `select dl.id as day_log_id, dl.log_date::text as log_date
         from meals m
         join day_logs dl on dl.id = m.day_log_id
         where m.id = $1 and m.user_id = $2`
  const { rows } = await query(sql, [itemId, userId])
  return rows[0] ?? null
}

export async function afterDayLogChanged(userId, _logDate) {
  return syncCommunityVisibilityAfterLogChange(userId)
}

export async function afterDayLogIdChanged(
  userId,
  dayLogId,
  { mealChanged = false } = {},
) {
  const logDate = await logDateFromDayLogId(userId, dayLogId)
  const result = await afterDayLogChanged(userId, logDate)
  if (mealChanged && logDate && isCurrentLogDate(logDate)) {
    scheduleMicronutrientRefresh(userId, dayLogId)
  }
  return result
}

export async function afterExerciseOrMealChanged(userId, itemId, table) {
  const context = await logContextFromItemId(userId, itemId, table)
  const result = await afterDayLogChanged(userId, context?.log_date ?? null)
  if (table === 'meals' && context?.day_log_id && isCurrentLogDate(context.log_date)) {
    scheduleMicronutrientRefresh(userId, context.day_log_id)
  }
  return result
}

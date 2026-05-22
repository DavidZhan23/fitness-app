import { syncCommunityVisibilityAfterLogChange } from './communityVisibility.js'
import { query } from './db.js'

async function logDateFromDayLogId(userId, dayLogId) {
  const { rows } = await query(
    `select log_date::text as log_date from day_logs where id = $1 and user_id = $2`,
    [dayLogId, userId],
  )
  return rows[0]?.log_date ?? null
}

async function logDateFromItemId(userId, itemId, table) {
  const sql =
    table === 'exercises'
      ? `select dl.log_date::text as log_date
         from exercises e
         join day_logs dl on dl.id = e.day_log_id
         where e.id = $1 and e.user_id = $2`
      : `select dl.log_date::text as log_date
         from meals m
         join day_logs dl on dl.id = m.day_log_id
         where m.id = $1 and m.user_id = $2`
  const { rows } = await query(sql, [itemId, userId])
  return rows[0]?.log_date ?? null
}

export async function afterDayLogChanged(userId, _logDate) {
  return syncCommunityVisibilityAfterLogChange(userId)
}

export async function afterDayLogIdChanged(userId, dayLogId) {
  const logDate = await logDateFromDayLogId(userId, dayLogId)
  return afterDayLogChanged(userId, logDate)
}

export async function afterExerciseOrMealChanged(userId, itemId, table) {
  const logDate = await logDateFromItemId(userId, itemId, table)
  return afterDayLogChanged(userId, logDate)
}

#!/usr/bin/env node
/**
 * Seed community interactions for manual QA on a fixed local account (jerry).
 * Runs cleanup first (idempotent). Local fitness DB only.
 *
 * Usage:
 *   npm run seed:qa-manual
 *   QA_SEED_FEATURE=community-inbox npm run seed:qa-manual
 */

import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertLocalFitnessDatabase } from './lib/assert-local-fitness-db.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const QA_MANUAL_EMAIL =
  process.env.QA_MANUAL_EMAIL?.trim().toLowerCase() ?? 'jerryuk1019@163.com'
const QA_SEED_FEATURE = process.env.QA_SEED_FEATURE?.trim() || 'manual'
const FAN_A_EMAIL = 'qa-seed+fan-a@example.com'
const FAN_B_EMAIL = 'qa-seed+fan-b@example.com'
const QA_SEED_PASSWORD = 'qa-seed-pass-123456'

const databaseUrl =
  process.env.DATABASE_URL ?? 'postgres://localhost:5432/fitness'

process.env.DATABASE_URL = databaseUrl
process.env.JWT_SECRET =
  process.env.JWT_SECRET ??
  'e2e_jwt_secret_min_32_chars_for_local_dev_xx'

function tag(text) {
  return `[${QA_SEED_FEATURE}] ${text}`
}

function nick(label) {
  return `QA ${QA_SEED_FEATURE} ${label}`.slice(0, 32)
}

try {
  assertLocalFitnessDatabase(databaseUrl)
} catch (err) {
  console.error('qa-seed refused:', err instanceof Error ? err.message : err)
  process.exit(1)
}

execFileSync('node', ['scripts/cleanup-qa-seed.mjs'], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
})

const { query, pool } = await import('../server/src/db.js')
const { formatDateKeyInTz, shiftDateKey } = await import('../server/src/dateKey.js')
const { registerUser } = await import('../server/src/auth.js')
const { buildProfileUpdate } = await import('../server/src/profilePatch.js')
const {
  followUser,
  addDayComment,
  likeDay,
  likeDayComment,
  dislikeDayComment,
} = await import('../server/src/social.js')
const { afterDayLogIdChanged } = await import('../server/src/dayLogMutation.js')

try {
  const { rows: jerryRows } = await query(
    `select id, email from users where email = $1`,
    [QA_MANUAL_EMAIL],
  )
  const jerry = jerryRows[0]
  if (!jerry) {
    console.warn(
      `qa-seed: manual account ${QA_MANUAL_EMAIL} not found — skip seed (exit 0). Create the account locally first.`,
    )
    process.exit(0)
  }

  const today = formatDateKeyInTz()

  async function applyProfile(userId, displayLabel) {
    const { updates, values } = buildProfileUpdate({
      nickname: nick(displayLabel),
      weight_kg: 70,
      height_cm: 175,
      birthday: '1996-06-15',
      sex: 'male',
      activity_factor: 1.375,
      bmr: 1650,
      tdee: 2200,
      onboarding_complete: true,
      community_visible: true,
    })
    if (updates.length === 0) return
    values.push(userId)
    const idParam = values.length
    await query(
      `update profiles set ${updates.join(', ')} where id = $${idParam}`,
      values,
    )
  }

  async function ensureTodayDayLog(userId) {
    let { rows } = await query(
      `select id from day_logs where user_id = $1 and log_date = $2::date`,
      [userId, today],
    )
    if (rows[0]) return rows[0].id

    const prof = await query(`select tdee from profiles where id = $1`, [userId])
    const tdee = prof.rows[0]?.tdee ?? 2200
    const ins = await query(
      `insert into day_logs (user_id, log_date, tdee_snapshot, deficit)
       values ($1, $2::date, $3, $3)
       returning id`,
      [userId, today, tdee],
    )
    const dayLogId = ins.rows[0].id
    await query(
      `insert into exercises (day_log_id, user_id, name, kcal)
       values ($1, $2, $3, $4)`,
      [dayLogId, userId, tag('seed exercise'), 120],
    )
    await afterDayLogIdChanged(userId, dayLogId)
    return dayLogId
  }

  async function ensureQaUser(email, label) {
    let { rows } = await query(`select id, email from users where email = $1`, [
      email,
    ])
    if (!rows[0]) {
      const user = await registerUser(email, QA_SEED_PASSWORD)
      rows = [{ id: user.id, email: user.email }]
    }
    await applyProfile(rows[0].id, label)
    await ensureTodayDayLog(rows[0].id)
    return rows[0]
  }

  await ensureTodayDayLog(jerry.id)

  await query(
    `update profiles set community_notify_seen_at = null where id = $1`,
    [jerry.id],
  )

  const fanA = await ensureQaUser(FAN_A_EMAIL, 'fan-a')
  const fanB = await ensureQaUser(FAN_B_EMAIL, 'fan-b')

  await followUser(fanA.id, jerry.id)
  console.log(tag('fan-a followed Jerry'))

  const comment = await addDayComment(
    fanA.id,
    jerry.id,
    today,
    tag('fan-a comment on Jerry today — check inbox & user page #day-comments'),
  )
  console.log(tag(`fan-a commented (${comment.id})`))

  await likeDay(fanB.id, jerry.id, today)
  console.log(tag('fan-b liked Jerry today'))

  await likeDayComment(fanB.id, comment.id)
  console.log(tag('fan-b liked fan-a comment'))

  await dislikeDayComment(fanB.id, comment.id)
  console.log(tag('fan-b disliked fan-a comment (replaces like on dislike path)'))

  console.log('')
  console.log('qa-seed: manual QA data ready.')
  console.log(`  Target: ${QA_MANUAL_EMAIL} (log in with your existing password)`)
  console.log(`  Feature tag: ${QA_SEED_FEATURE}`)
  console.log('  Check: 社区 → 查看互动消息 / 关注者 / 你的用户页今日评论')
  console.log(`  Seed actors: ${FAN_A_EMAIL}, ${FAN_B_EMAIL}`)
  console.log('  Before PR: npm run cleanup:qa-seed')
} catch (err) {
  console.error(
    'qa-seed failed:',
    err instanceof Error ? err.message : err,
  )
  process.exit(1)
} finally {
  await pool.end()
}

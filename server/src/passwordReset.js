import bcrypt from 'bcryptjs'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { pool, query } from './db.js'

const TOKEN_BYTES = 32
const TOKEN_TTL_MS = 60 * 60 * 1000

export function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase()
}

export function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 6
}

export function hashResetToken(token) {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

export function equalTokenHash(a, b) {
  const left = Buffer.from(String(a ?? ''), 'hex')
  const right = Buffer.from(String(b ?? ''), 'hex')
  if (left.length !== right.length || left.length === 0) return false
  return timingSafeEqual(left, right)
}

export async function findUserByEmail(email) {
  const normalized = normalizeEmail(email)
  if (!normalized) return null
  const { rows } = await query(`select id, email from users where email = $1`, [
    normalized,
  ])
  return rows[0] ?? null
}

export async function createPasswordResetToken(userId) {
  const token = randomBytes(TOKEN_BYTES).toString('base64url')
  const tokenHash = hashResetToken(token)
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS)

  const client = await pool.connect()
  try {
    await client.query('begin')
    await client.query(
      `update password_reset_tokens
       set used_at = now()
       where user_id = $1 and used_at is null`,
      [userId],
    )
    await client.query(
      `insert into password_reset_tokens (user_id, token_hash, expires_at)
       values ($1, $2, $3)`,
      [userId, tokenHash, expiresAt],
    )
    await client.query('commit')
  } catch (err) {
    await client.query('rollback')
    throw err
  } finally {
    client.release()
  }

  return { token, expiresAt }
}

export async function resetPasswordWithToken(token, password) {
  if (!token || !isValidPassword(password)) {
    const err = new Error('重置链接无效或新密码少于 6 位')
    err.status = 400
    throw err
  }

  const tokenHash = hashResetToken(token)
  const passwordHash = await bcrypt.hash(password, 10)
  const client = await pool.connect()

  try {
    await client.query('begin')
    const { rows } = await client.query(
      `select id, user_id, token_hash, expires_at, used_at
       from password_reset_tokens
       where token_hash = $1
       for update`,
      [tokenHash],
    )
    const row = rows[0]
    if (
      !row ||
      row.used_at ||
      new Date(row.expires_at).getTime() <= Date.now() ||
      !equalTokenHash(row.token_hash, tokenHash)
    ) {
      const err = new Error('重置链接无效或已过期，请重新发送邮件')
      err.status = 400
      throw err
    }

    await client.query(`update users set password_hash = $1 where id = $2`, [
      passwordHash,
      row.user_id,
    ])
    await client.query(
      `update password_reset_tokens set used_at = now() where id = $1`,
      [row.id],
    )
    await client.query(
      `update password_reset_tokens
       set used_at = now()
       where user_id = $1 and used_at is null and id <> $2`,
      [row.user_id, row.id],
    )
    await client.query('commit')
  } catch (err) {
    await client.query('rollback')
    throw err
  } finally {
    client.release()
  }
}

export function buildPasswordResetUrl(token) {
  const base =
    process.env.PASSWORD_RESET_BASE_URL?.trim() ||
    process.env.APP_BASE_URL?.trim() ||
    process.env.CORS_ORIGIN?.split(',')[0]?.trim()
  if (!base) {
    const err = new Error('PASSWORD_RESET_BASE_URL or APP_BASE_URL must be set')
    err.status = 500
    throw err
  }
  const url = new URL(base)
  url.pathname = '/login'
  url.searchParams.set('reset_token', token)
  return url.toString()
}

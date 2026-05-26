import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { query } from './db.js'

const JWT_SECRET = process.env.JWT_SECRET?.trim()
if (!JWT_SECRET) {
  throw new Error(
    'JWT_SECRET must be set in environment (copy server/.env.example to server/.env)',
  )
}

export function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: '30d',
  })
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET)
}

export async function registerUser(email, password) {
  const hash = await bcrypt.hash(password, 10)
  const client = await (await import('./db.js')).pool.connect()
  try {
    await client.query('begin')
    const userRes = await client.query(
      `insert into users (email, password_hash) values ($1, $2) returning id, email`,
      [email.toLowerCase().trim(), hash],
    )
    const user = userRes.rows[0]
    await client.query(
      `insert into profiles (id, email) values ($1, $2)`,
      [user.id, user.email],
    )
    await client.query('commit')
    return user
  } catch (e) {
    await client.query('rollback')
    if (e.code === '23505') {
      const err = new Error('该邮箱已注册')
      err.status = 400
      throw err
    }
    throw e
  } finally {
    client.release()
  }
}

export async function loginUser(email, password) {
  const res = await query(
    `select id, email, password_hash from users where email = $1`,
    [email.toLowerCase().trim()],
  )
  const row = res.rows[0]
  if (!row) {
    const err = new Error('邮箱或密码错误')
    err.status = 401
    throw err
  }
  const ok = await bcrypt.compare(password, row.password_hash)
  if (!ok) {
    const err = new Error('邮箱或密码错误')
    err.status = 401
    throw err
  }
  return { id: row.id, email: row.email }
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录' })
  }
  try {
    const payload = verifyToken(header.slice(7))
    req.userId = payload.sub
    req.userEmail = payload.email
    next()
  } catch {
    return res.status(401).json({ error: '登录已过期，请重新登录' })
  }
}

/** @param {string | undefined} raw */
export function parseEmailAllowlist(raw) {
  return (raw ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

/**
 * 开发者邮箱白名单：优先 DEVELOPER_EMAILS，未配置时回退 ADMIN_EMAILS（兼容旧部署）。
 */
export function getDeveloperEmails() {
  const dev = parseEmailAllowlist(process.env.DEVELOPER_EMAILS)
  if (dev.length > 0) return dev
  return parseEmailAllowlist(process.env.ADMIN_EMAILS)
}

/** @param {string | undefined} email */
export function isDeveloperEmail(email) {
  const allowed = getDeveloperEmails()
  if (allowed.length === 0) return false
  return allowed.includes((email ?? '').toLowerCase())
}

/** @param {{ id: string, email: string }} user */
export function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    isDeveloper: isDeveloperEmail(user.email),
  }
}

/**
 * 开发者专用接口鉴权（周报等）。须在 authMiddleware 之后使用。
 */
export function requireDeveloper(req, res, next) {
  if (!isDeveloperEmail(req.userEmail)) {
    const configured = getDeveloperEmails().length > 0
    return res.status(403).json({
      error: configured ? '无开发者权限' : '开发者功能未配置',
    })
  }
  next()
}

/** @deprecated 使用 requireDeveloper；保留别名避免旧引用断裂 */
export const requireAdmin = requireDeveloper

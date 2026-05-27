import { Router } from 'express'
import { asyncHandler } from '../asyncHandler.js'
import { buildProfileUpdate } from '../profilePatch.js'
import {
  authMiddleware,
  loginUser,
  registerUser,
  signToken,
  toPublicUser,
} from '../auth.js'
import { assertRegistrationKey } from '../registrationKey.js'
import { query } from '../db.js'
import { getDeepSeekApiKey } from '../ai/providers/deepseekText.js'

const router = Router()

router.get(
  '/health',
  asyncHandler(async (_req, res) => {
    await query('select 1')
    res.json({ ok: true, aiConfigured: Boolean(getDeepSeekApiKey()) })
  }),
)

router.post(
  '/auth/register',
  asyncHandler(async (req, res) => {
    const { email, password, registration_key } = req.body
    if (!email || !password || password.length < 6) {
      return res.status(400).json({ error: '邮箱与密码（至少6位）必填' })
    }
    assertRegistrationKey(registration_key)
    const user = await registerUser(email, password)
    const token = signToken(user)
    res.json({
      token,
      user: toPublicUser(user),
      needsEmailConfirmation: false,
    })
  }),
)

router.post(
  '/auth/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body
    const user = await loginUser(email, password)
    const token = signToken(user)
    res.json({ token, user: toPublicUser(user) })
  }),
)

router.get(
  '/auth/me',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      user: toPublicUser({ id: req.userId, email: req.userEmail }),
    })
  }),
)

router.get(
  '/profile',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { rows } = await query(`select * from profiles where id = $1`, [
      req.userId,
    ])
    if (!rows[0]) return res.status(404).json({ error: '资料不存在' })
    res.json(rows[0])
  }),
)

router.patch(
  '/profile',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { updates, values } = buildProfileUpdate(req.body)
    if (updates.length === 0) {
      return res.status(400).json({ error: '无有效更新字段' })
    }
    values.push(req.userId)
    const idParam = values.length
    const { rows } = await query(
      `update profiles set ${updates.join(', ')} where id = $${idParam} returning *`,
      values,
    )
    if (!rows[0]) return res.status(404).json({ error: '资料不存在' })
    res.json(rows[0])
  }),
)

export default router

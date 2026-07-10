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
import { getDashScopeApiKey } from '../ai/providers/qwenVision.js'
import {
  buildPasswordResetUrl,
  createPasswordResetToken,
  findUserByEmail,
  isValidPassword,
  resetPasswordWithToken,
} from '../passwordReset.js'
import { sendPasswordResetEmail } from '../mailer.js'

const router = Router()

router.get(
  '/health',
  asyncHandler(async (_req, res) => {
    await query('select 1')
    res.json({
      ok: true,
      aiConfigured: Boolean(getDeepSeekApiKey()),
      aiVisionConfigured: Boolean(getDashScopeApiKey()),
    })
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

router.post(
  '/auth/password-reset/request',
  asyncHandler(async (req, res) => {
    const { email } = req.body
    if (!email) {
      return res.status(400).json({ error: '邮箱必填' })
    }

    const user = await findUserByEmail(email)
    if (user) {
      const { token, expiresAt } = await createPasswordResetToken(user.id)
      const resetUrl = buildPasswordResetUrl(token)
      await sendPasswordResetEmail({
        to: user.email,
        resetUrl,
        expiresAt,
      })
    }

    res.json({
      ok: true,
      message: '如果该邮箱已注册，重置邮件会在几分钟内送达',
    })
  }),
)

router.post(
  '/auth/password-reset/confirm',
  asyncHandler(async (req, res) => {
    const { token, password } = req.body
    if (!token || !isValidPassword(password)) {
      return res.status(400).json({ error: '重置链接无效或新密码少于 6 位' })
    }
    await resetPasswordWithToken(token, password)
    res.json({ ok: true })
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

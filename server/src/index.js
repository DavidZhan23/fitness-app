import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { asyncHandler } from './asyncHandler.js'
import { buildProfileUpdate } from './profilePatch.js'
import { authMiddleware, loginUser, registerUser, signToken } from './auth.js'
import { query, waitForDb } from './db.js'

const app = express()
const port = Number(process.env.PORT || 3001)

const corsOrigin = process.env.CORS_ORIGIN || '*'
app.use(cors({ origin: corsOrigin === '*' ? true : corsOrigin.split(',') }))
app.use(express.json())

app.get(
  '/health',
  asyncHandler(async (_req, res) => {
    await query('select 1')
    res.json({ ok: true })
  }),
)

app.post(
  '/auth/register',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body
    if (!email || !password || password.length < 6) {
      return res.status(400).json({ error: '邮箱与密码（至少6位）必填' })
    }
    const user = await registerUser(email, password)
    const token = signToken(user)
    res.json({
      token,
      user: { id: user.id, email: user.email },
      needsEmailConfirmation: false,
    })
  }),
)

app.post(
  '/auth/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body
    const user = await loginUser(email, password)
    const token = signToken(user)
    res.json({ token, user: { id: user.id, email: user.email } })
  }),
)

app.get(
  '/auth/me',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({ user: { id: req.userId, email: req.userEmail } })
  }),
)

app.get(
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

app.patch(
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

app.get(
  '/day-logs/range',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { from, to } = req.query
    const { rows } = await query(
      `select * from day_logs where user_id = $1 and log_date >= $2 and log_date <= $3 order by log_date`,
      [req.userId, from, to],
    )
    res.json(rows)
  }),
)

app.get(
  '/day-logs/:date',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { date } = req.params
    let { rows } = await query(
      `select * from day_logs where user_id = $1 and log_date = $2`,
      [req.userId, date],
    )
    let dayLog = rows[0]
    if (!dayLog) {
      const profile = await query(`select tdee from profiles where id = $1`, [
        req.userId,
      ])
      const tdee = profile.rows[0]?.tdee ?? 0
      const ins = await query(
        `insert into day_logs (user_id, log_date, tdee_snapshot, deficit)
         values ($1, $2, $3, $3) returning *`,
        [req.userId, date, tdee],
      )
      dayLog = ins.rows[0]
    }
    const [ex, meals] = await Promise.all([
      query(
        `select * from exercises where day_log_id = $1 order by created_at desc`,
        [dayLog.id],
      ),
      query(`select * from meals where day_log_id = $1 order by created_at desc`, [
        dayLog.id,
      ]),
    ])
    res.json({ dayLog, exercises: ex.rows, meals: meals.rows })
  }),
)

app.post(
  '/day-logs/ensure',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { log_date, tdee_snapshot } = req.body
    let { rows } = await query(
      `select * from day_logs where user_id = $1 and log_date = $2`,
      [req.userId, log_date],
    )
    if (rows[0]) return res.json(rows[0])
    const ins = await query(
      `insert into day_logs (user_id, log_date, tdee_snapshot, deficit)
       values ($1, $2, $3, $3) returning *`,
      [req.userId, log_date, tdee_snapshot],
    )
    res.json(ins.rows[0])
  }),
)

app.post(
  '/exercises',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { day_log_id, name, kcal } = req.body
    await query(
      `insert into exercises (day_log_id, user_id, name, kcal) values ($1, $2, $3, $4)`,
      [day_log_id, req.userId, name, kcal],
    )
    const { rows } = await query(`select * from day_logs where id = $1`, [
      day_log_id,
    ])
    res.json(rows[0])
  }),
)

app.delete(
  '/exercises/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    await query(`delete from exercises where id = $1 and user_id = $2`, [
      req.params.id,
      req.userId,
    ])
    res.json({ ok: true })
  }),
)

app.post(
  '/meals',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { day_log_id, name, kcal } = req.body
    await query(
      `insert into meals (day_log_id, user_id, name, kcal) values ($1, $2, $3, $4)`,
      [day_log_id, req.userId, name, kcal],
    )
    const { rows } = await query(`select * from day_logs where id = $1`, [
      day_log_id,
    ])
    res.json(rows[0])
  }),
)

app.delete(
  '/meals/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    await query(`delete from meals where id = $1 and user_id = $2`, [
      req.params.id,
      req.userId,
    ])
    res.json({ ok: true })
  }),
)

app.get(
  '/templates/:type',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const table =
      req.params.type === 'exercise' ? 'exercise_templates' : 'meal_templates'
    const { rows } = await query(
      `select * from ${table} where user_id = $1 order by name`,
      [req.userId],
    )
    res.json(rows)
  }),
)

app.post(
  '/templates/:type',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const table =
      req.params.type === 'exercise' ? 'exercise_templates' : 'meal_templates'
    const { name, kcal } = req.body
    const { rows } = await query(
      `insert into ${table} (user_id, name, kcal) values ($1, $2, $3) returning *`,
      [req.userId, name, kcal],
    )
    res.json(rows[0])
  }),
)

app.delete(
  '/templates/:type/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const table =
      req.params.type === 'exercise' ? 'exercise_templates' : 'meal_templates'
    await query(`delete from ${table} where id = $1 and user_id = $2`, [
      req.params.id,
      req.userId,
    ])
    res.json({ ok: true })
  }),
)

app.post(
  '/templates/seed',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { exerciseTemplates, mealTemplates } = req.body
    const exCount = await query(
      `select count(*)::int as c from exercise_templates where user_id = $1`,
      [req.userId],
    )
    if (Number(exCount.rows[0].c) === 0 && exerciseTemplates?.length) {
      for (const t of exerciseTemplates) {
        await query(
          `insert into exercise_templates (user_id, name, kcal) values ($1, $2, $3)`,
          [req.userId, t.name, t.kcal],
        )
      }
    }
    const mealCount = await query(
      `select count(*)::int as c from meal_templates where user_id = $1`,
      [req.userId],
    )
    if (Number(mealCount.rows[0].c) === 0 && mealTemplates?.length) {
      for (const t of mealTemplates) {
        await query(
          `insert into meal_templates (user_id, name, kcal) values ($1, $2, $3)`,
          [req.userId, t.name, t.kcal],
        )
      }
    }
    res.json({ ok: true })
  }),
)

// 注册 / 登录等业务错误（带 status）
app.use((err, req, res, _next) => {
  if (res.headersSent) return
  const status = err.status || 500
  if (status >= 500) {
    console.error('[api]', req.method, req.path, err)
  }
  let message = err.message || '请求失败'
  if (status >= 500) {
    if (err.code === '23514') message = '资料数值不合法，请检查体重、身高等'
    else if (err.code === '22P02') message = '资料格式错误，请检查输入'
    else if (err.code === '22003') message = '数值超出范围，请检查活动系数等'
    else message = '服务器繁忙，请稍后重试'
    console.error('[api]', req.method, req.path, err.code, err.detail || err.message)
  }
  res.status(status).json({ error: message })
})

async function start() {
  await waitForDb()
  app.listen(port, '0.0.0.0', () => {
    console.log(`API listening on http://0.0.0.0:${port}`)
  })
}

start().catch((err) => {
  console.error('[api] failed to start', err)
  process.exit(1)
})

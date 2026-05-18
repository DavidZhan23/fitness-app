import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { authMiddleware, loginUser, registerUser, signToken } from './auth.js'
import { query } from './db.js'

const app = express()
const port = Number(process.env.PORT || 3001)

const corsOrigin = process.env.CORS_ORIGIN || '*'
app.use(cors({ origin: corsOrigin === '*' ? true : corsOrigin.split(',') }))
app.use(express.json())

app.get('/health', (_req, res) => res.json({ ok: true }))

app.post('/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password || password.length < 6) {
      return res.status(400).json({ error: '邮箱与密码（至少6位）必填' })
    }
    const user = await registerUser(email, password)
    const token = signToken(user)
    res.json({ token, user: { id: user.id, email: user.email }, needsEmailConfirmation: false })
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || '注册失败' })
  }
})

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await loginUser(email, password)
    const token = signToken(user)
    res.json({ token, user: { id: user.id, email: user.email } })
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || '登录失败' })
  }
})

app.get('/auth/me', authMiddleware, async (req, res) => {
  res.json({ user: { id: req.userId, email: req.userEmail } })
})

app.get('/profile', authMiddleware, async (req, res) => {
  const { rows } = await query(`select * from profiles where id = $1`, [req.userId])
  if (!rows[0]) return res.status(404).json({ error: '资料不存在' })
  res.json(rows[0])
})

app.patch('/profile', authMiddleware, async (req, res) => {
  const fields = [
    'weight_kg',
    'height_cm',
    'age',
    'sex',
    'activity_factor',
    'bmr',
    'tdee',
    'deficit_threshold',
    'onboarding_complete',
  ]
  const updates = []
  const values = []
  let i = 1
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = $${i++}`)
      values.push(req.body[f])
    }
  }
  if (updates.length === 0) {
    return res.status(400).json({ error: '无更新字段' })
  }
  updates.push(`updated_at = now()`)
  values.push(req.userId)
  const { rows } = await query(
    `update profiles set ${updates.join(', ')} where id = $${i} returning *`,
    values,
  )
  res.json(rows[0])
})

app.get('/day-logs/range', authMiddleware, async (req, res) => {
  const { from, to } = req.query
  const { rows } = await query(
    `select * from day_logs where user_id = $1 and log_date >= $2 and log_date <= $3 order by log_date`,
    [req.userId, from, to],
  )
  res.json(rows)
})

app.get('/day-logs/:date', authMiddleware, async (req, res) => {
  const { date } = req.params
  let { rows } = await query(
    `select * from day_logs where user_id = $1 and log_date = $2`,
    [req.userId, date],
  )
  let dayLog = rows[0]
  if (!dayLog) {
    const profile = await query(`select tdee from profiles where id = $1`, [req.userId])
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
})

app.post('/day-logs/ensure', authMiddleware, async (req, res) => {
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
})

app.post('/exercises', authMiddleware, async (req, res) => {
  const { day_log_id, name, kcal } = req.body
  await query(
    `insert into exercises (day_log_id, user_id, name, kcal) values ($1, $2, $3, $4)`,
    [day_log_id, req.userId, name, kcal],
  )
  const { rows } = await query(`select * from day_logs where id = $1`, [day_log_id])
  res.json(rows[0])
})

app.delete('/exercises/:id', authMiddleware, async (req, res) => {
  await query(`delete from exercises where id = $1 and user_id = $2`, [
    req.params.id,
    req.userId,
  ])
  res.json({ ok: true })
})

app.post('/meals', authMiddleware, async (req, res) => {
  const { day_log_id, name, kcal } = req.body
  await query(
    `insert into meals (day_log_id, user_id, name, kcal) values ($1, $2, $3, $4)`,
    [day_log_id, req.userId, name, kcal],
  )
  const { rows } = await query(`select * from day_logs where id = $1`, [day_log_id])
  res.json(rows[0])
})

app.delete('/meals/:id', authMiddleware, async (req, res) => {
  await query(`delete from meals where id = $1 and user_id = $2`, [
    req.params.id,
    req.userId,
  ])
  res.json({ ok: true })
})

app.get('/templates/:type', authMiddleware, async (req, res) => {
  const table =
    req.params.type === 'exercise' ? 'exercise_templates' : 'meal_templates'
  const { rows } = await query(
    `select * from ${table} where user_id = $1 order by name`,
    [req.userId],
  )
  res.json(rows)
})

app.post('/templates/:type', authMiddleware, async (req, res) => {
  const table =
    req.params.type === 'exercise' ? 'exercise_templates' : 'meal_templates'
  const { name, kcal } = req.body
  const { rows } = await query(
    `insert into ${table} (user_id, name, kcal) values ($1, $2, $3) returning *`,
    [req.userId, name, kcal],
  )
  res.json(rows[0])
})

app.delete('/templates/:type/:id', authMiddleware, async (req, res) => {
  const table =
    req.params.type === 'exercise' ? 'exercise_templates' : 'meal_templates'
  await query(`delete from ${table} where id = $1 and user_id = $2`, [
    req.params.id,
    req.userId,
  ])
  res.json({ ok: true })
})

app.post('/templates/seed', authMiddleware, async (req, res) => {
  const { exerciseTemplates, mealTemplates } = req.body
  const exCount = await query(
    `select count(*)::int as c from exercise_templates where user_id = $1`,
    [req.userId],
  )
  if (exCount.rows[0].c === 0 && exerciseTemplates?.length) {
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
  if (mealCount.rows[0].c === 0 && mealTemplates?.length) {
    for (const t of mealTemplates) {
      await query(
        `insert into meal_templates (user_id, name, kcal) values ($1, $2, $3)`,
        [req.userId, t.name, t.kcal],
      )
    }
  }
  res.json({ ok: true })
})

app.listen(port, () => {
  console.log(`API listening on http://0.0.0.0:${port}`)
})

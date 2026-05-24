import { Router } from 'express'
import { asyncHandler } from '../asyncHandler.js'
import { authMiddleware } from '../auth.js'
import { query } from '../db.js'
import {
  afterDayLogIdChanged,
  afterExerciseOrMealChanged,
} from '../dayLogMutation.js'

const router = Router()

router.get(
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

router.get(
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
    res.json({
      dayLog,
      exercises: ex.rows,
      meals: meals.rows,
    })
  }),
)

router.post(
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

router.post(
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
    const visibility = await afterDayLogIdChanged(req.userId, day_log_id)
    res.json({ ...rows[0], community_visible: visibility?.community_visible })
  }),
)

router.patch(
  '/exercises/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { name, kcal } = req.body
    if (!name?.trim() || kcal == null || Number(kcal) <= 0) {
      return res.status(400).json({ error: '请填写名称和有效热量' })
    }
    const { rows } = await query(
      `update exercises set name = $1, kcal = $2
       where id = $3 and user_id = $4
       returning *`,
      [name.trim(), kcal, req.params.id, req.userId],
    )
    if (!rows[0]) return res.status(404).json({ error: '记录不存在' })
    const visibility = await afterExerciseOrMealChanged(
      req.userId,
      req.params.id,
      'exercises',
    )
    res.json({ ...rows[0], community_visible: visibility?.community_visible })
  }),
)

router.delete(
  '/exercises/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const visibility = await afterExerciseOrMealChanged(
      req.userId,
      req.params.id,
      'exercises',
    )
    await query(`delete from exercises where id = $1 and user_id = $2`, [
      req.params.id,
      req.userId,
    ])
    res.json({ ok: true, community_visible: visibility?.community_visible })
  }),
)

router.post(
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
    const visibility = await afterDayLogIdChanged(req.userId, day_log_id)
    res.json({ ...rows[0], community_visible: visibility?.community_visible })
  }),
)

router.patch(
  '/meals/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { name, kcal } = req.body
    if (!name?.trim() || kcal == null || Number(kcal) <= 0) {
      return res.status(400).json({ error: '请填写名称和有效热量' })
    }
    const { rows } = await query(
      `update meals set name = $1, kcal = $2
       where id = $3 and user_id = $4
       returning *`,
      [name.trim(), kcal, req.params.id, req.userId],
    )
    if (!rows[0]) return res.status(404).json({ error: '记录不存在' })
    const visibility = await afterExerciseOrMealChanged(
      req.userId,
      req.params.id,
      'meals',
    )
    res.json({ ...rows[0], community_visible: visibility?.community_visible })
  }),
)

router.delete(
  '/meals/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const visibility = await afterExerciseOrMealChanged(
      req.userId,
      req.params.id,
      'meals',
    )
    await query(`delete from meals where id = $1 and user_id = $2`, [
      req.params.id,
      req.userId,
    ])
    res.json({ ok: true, community_visible: visibility?.community_visible })
  }),
)

// /templates/seed must be registered before /templates/:type to avoid `:type` capturing "seed"
router.post(
  '/templates/seed',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { exerciseTemplates, mealTemplates } = req.body
    const { rows: counts } = await query(
      `select
         (select count(*)::int from exercise_templates where user_id = $1) as ex,
         (select count(*)::int from meal_templates where user_id = $1) as meal`,
      [req.userId],
    )
    const exCount = Number(counts[0]?.ex ?? 0)
    const mealCount = Number(counts[0]?.meal ?? 0)
    if (exCount === 0 && exerciseTemplates?.length) {
      for (const t of exerciseTemplates) {
        await query(
          `insert into exercise_templates (user_id, name, kcal) values ($1, $2, $3)`,
          [req.userId, t.name, t.kcal],
        )
      }
    }
    if (mealCount === 0 && mealTemplates?.length) {
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

router.get(
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

router.post(
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

router.delete(
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

export default router

import { Router } from 'express'
import { asyncHandler } from '../asyncHandler.js'
import { authMiddleware } from '../auth.js'
import { query } from '../db.js'
import {
  afterDayLogIdChanged,
  afterExerciseOrMealChanged,
} from '../dayLogMutation.js'

const router = Router()

/** PG date 经 node-pg 序列化易带 UTC 时刻；对外统一 YYYY-MM-DD 文本 */
const DAY_LOG_SELECT = `id, user_id, log_date::text as log_date, tdee_snapshot, exercise_kcal, meal_kcal, deficit, created_at, updated_at, community_visible`

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function parseOptionalBatchId(value) {
  if (value == null || value === '') return { batchId: null }
  if (typeof value !== 'string' || !UUID_RE.test(value.trim())) {
    return { error: 'batch_id 无效' }
  }
  return { batchId: value.trim() }
}

async function getOrCreateDayLog(userId, date, tdee) {
  let { rows } = await query(
    `select ${DAY_LOG_SELECT} from day_logs where user_id = $1 and log_date = $2`,
    [userId, date],
  )
  if (rows[0]) return rows[0]

  try {
    const ins = await query(
      `insert into day_logs (user_id, log_date, tdee_snapshot, deficit)
       values ($1, $2, $3, $3) returning ${DAY_LOG_SELECT}`,
      [userId, date, tdee],
    )
    return ins.rows[0]
  } catch (err) {
    if (err.code !== '23505') throw err
    const retry = await query(
      `select ${DAY_LOG_SELECT} from day_logs where user_id = $1 and log_date = $2`,
      [userId, date],
    )
    if (!retry.rows[0]) throw err
    return retry.rows[0]
  }
}

router.get(
  '/day-logs/range',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { from, to } = req.query
    const { rows } = await query(
      `select ${DAY_LOG_SELECT} from day_logs where user_id = $1 and log_date >= $2 and log_date <= $3 order by log_date`,
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
    const profile = await query(`select tdee from profiles where id = $1`, [
      req.userId,
    ])
    const tdee = profile.rows[0]?.tdee ?? 0
    const dayLog = await getOrCreateDayLog(req.userId, date, tdee)
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
    const dayLog = await getOrCreateDayLog(
      req.userId,
      log_date,
      tdee_snapshot ?? 0,
    )
    res.json(dayLog)
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
    const { day_log_id, name, kcal, batch_id } = req.body
    const parsedBatch = parseOptionalBatchId(batch_id)
    if (parsedBatch.error) {
      return res.status(400).json({ error: parsedBatch.error })
    }
    await query(
      `insert into meals (day_log_id, user_id, name, kcal, batch_id)
       values ($1, $2, $3, $4, $5)`,
      [day_log_id, req.userId, name, kcal, parsedBatch.batchId],
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

function parseTemplateFields(body) {
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const unit = typeof body?.unit === 'string' ? body.unit.trim() : ''
  const kcalPerUnit = Number(body?.kcalPerUnit ?? body?.kcal_per_unit)
  const defaultQuantity = Number(body?.defaultQuantity ?? body?.default_quantity)
  if (!name) return { error: '请填写模板名称' }
  if (!unit) return { error: '请填写单位' }
  if (!Number.isFinite(kcalPerUnit) || kcalPerUnit <= 0) {
    return { error: '请填写有效的单位热量' }
  }
  if (!Number.isFinite(defaultQuantity) || defaultQuantity <= 0) {
    return { error: '请填写有效的默认数量' }
  }
  const kcal = Math.round(kcalPerUnit * defaultQuantity)
  return { name, unit, kcalPerUnit, defaultQuantity, kcal }
}

function parseSeedTemplate(raw) {
  if (raw?.unit != null && raw?.kcalPerUnit != null) {
    return parseTemplateFields(raw)
  }
  const legacy = parseTemplateFields({
    name: raw?.name,
    unit: '份',
    kcalPerUnit: raw?.kcal,
    defaultQuantity: 1,
  })
  return legacy
}

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
      for (const raw of exerciseTemplates) {
        const parsed = parseSeedTemplate(raw)
        if (parsed.error) continue
        await query(
          `insert into exercise_templates
             (user_id, name, unit, kcal_per_unit, default_quantity, kcal)
           values ($1, $2, $3, $4, $5, $6)`,
          [
            req.userId,
            parsed.name,
            parsed.unit,
            parsed.kcalPerUnit,
            parsed.defaultQuantity,
            parsed.kcal,
          ],
        )
      }
    }
    if (mealCount === 0 && mealTemplates?.length) {
      for (const raw of mealTemplates) {
        const parsed = parseSeedTemplate(raw)
        if (parsed.error) continue
        await query(
          `insert into meal_templates
             (user_id, name, unit, kcal_per_unit, default_quantity, kcal)
           values ($1, $2, $3, $4, $5, $6)`,
          [
            req.userId,
            parsed.name,
            parsed.unit,
            parsed.kcalPerUnit,
            parsed.defaultQuantity,
            parsed.kcal,
          ],
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
    const parsed = parseTemplateFields(req.body)
    if (parsed.error) {
      res.status(400).json({ error: parsed.error })
      return
    }
    const { rows } = await query(
      `insert into ${table}
         (user_id, name, unit, kcal_per_unit, default_quantity, kcal)
       values ($1, $2, $3, $4, $5, $6)
       returning *`,
      [
        req.userId,
        parsed.name,
        parsed.unit,
        parsed.kcalPerUnit,
        parsed.defaultQuantity,
        parsed.kcal,
      ],
    )
    res.json(rows[0])
  }),
)

router.patch(
  '/templates/:type/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const table =
      req.params.type === 'exercise' ? 'exercise_templates' : 'meal_templates'
    const parsed = parseTemplateFields(req.body)
    if (parsed.error) {
      res.status(400).json({ error: parsed.error })
      return
    }
    const { rows } = await query(
      `update ${table}
       set name = $3, unit = $4, kcal_per_unit = $5, default_quantity = $6, kcal = $7
       where id = $1 and user_id = $2
       returning *`,
      [
        req.params.id,
        req.userId,
        parsed.name,
        parsed.unit,
        parsed.kcalPerUnit,
        parsed.defaultQuantity,
        parsed.kcal,
      ],
    )
    if (!rows.length) {
      res.status(404).json({ error: '模板不存在' })
      return
    }
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

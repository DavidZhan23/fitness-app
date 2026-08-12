import { Router } from 'express'
import { asyncHandler } from '../asyncHandler.js'
import { authMiddleware } from '../auth.js'
import { query } from '../db.js'
import {
  afterDayLogIdChanged,
  afterExerciseOrMealChanged,
} from '../dayLogMutation.js'
import { getKcalEstimator } from '../ai/registry.js'
import { isValidDateKey } from '../dateKey.js'
import {
  MEAL_MACRO_FIELDS,
  calibrateMealMacros,
  fillMissingMealMacros,
  hasAnyMealMacro,
  macrosFromEstimateItems,
  parseMealMacroInput,
  resolveMealMacrosSource,
} from '../mealMacros.js'
import {
  ensureMicronutrientsForDayRead,
  requestMicronutrientRefresh,
} from '../micronutrients.js'

const router = Router()

/** PG date 经 node-pg 序列化易带 UTC 时刻；对外统一 YYYY-MM-DD 文本 */
const DAY_LOG_BASE_SELECT = `id, user_id, log_date::text as log_date, tdee_snapshot, exercise_kcal, meal_kcal, deficit, created_at, updated_at, community_visible`
const DAY_LOG_SELECT = `${DAY_LOG_BASE_SELECT}, micronutrient_status, micronutrient_fingerprint, micronutrient_summary, micronutrient_updated_at, micronutrient_error`

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function parseOptionalBatchId(value) {
  if (value == null || value === '') return { batchId: null }
  if (typeof value !== 'string' || !UUID_RE.test(value.trim())) {
    return { error: 'batch_id 无效' }
  }
  return { batchId: value.trim() }
}

const MEAL_MACRO_ESTIMATE_TIMEOUT_MS = 8_000

async function estimateMissingMealMacros(userId, name) {
  try {
    const { rows } = await query(
      `select weight_kg from profiles where id = $1`,
      [userId],
    )
    const estimator = getKcalEstimator()
    const estimatePromise = estimator({
      kind: 'meal',
      description: name,
      profile: rows[0] || {},
      modality: 'text',
    })
    const timeoutPromise = new Promise((_, reject) => {
      const timer = setTimeout(() => {
        const err = new Error('meal macro estimate timeout')
        err.code = 'MEAL_MACRO_TIMEOUT'
        reject(err)
      }, MEAL_MACRO_ESTIMATE_TIMEOUT_MS)
      estimatePromise.finally(() => clearTimeout(timer)).catch(() => undefined)
    })
    const result = await Promise.race([estimatePromise, timeoutPromise])
    return macrosFromEstimateItems(result?.items)
  } catch (err) {
    console.warn('[meal-macros] estimate skipped:', err?.code || err?.message || err)
    return null
  }
}

async function resolveMealMacrosForSave({
  userId,
  name,
  kcal,
  macros,
  source,
}) {
  let next = fillMissingMealMacros(macros, null)
  const missingAny = MEAL_MACRO_FIELDS.some((field) => next[field] == null)
  let estimated = null
  let attemptedEstimate = false
  if (missingAny && source !== 'ai') {
    attemptedEstimate = true
    estimated = await estimateMissingMealMacros(userId, name)
    next = fillMissingMealMacros(next, estimated)
  }
  const calibrated = calibrateMealMacros(next, kcal)
  return {
    ...calibrated,
    source: resolveMealMacrosSource(calibrated.macros, {
      source,
      estimated: estimated != null,
      attemptedEstimate,
    }),
  }
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
      `select ${DAY_LOG_BASE_SELECT} from day_logs where user_id = $1 and log_date >= $2 and log_date <= $3 order by log_date`,
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
    let dayLog = await getOrCreateDayLog(req.userId, date, tdee)
    const [ex, meals] = await Promise.all([
      query(
        `select * from exercises where day_log_id = $1 order by created_at desc`,
        [dayLog.id],
      ),
      query(`select * from meals where day_log_id = $1 order by created_at desc`, [
        dayLog.id,
      ]),
    ])
    dayLog = await ensureMicronutrientsForDayRead({
      userId: req.userId,
      dayLog,
      meals: meals.rows,
    })
    res.json({
      dayLog,
      exercises: ex.rows,
      meals: meals.rows,
    })
  }),
)

router.post(
  '/day-logs/:date/micronutrients/refresh',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { date } = req.params
    if (!isValidDateKey(date)) {
      return res.status(400).json({ error: '日期格式无效' })
    }
    const dayLog = await requestMicronutrientRefresh(req.userId, date)
    if (!dayLog) return res.status(404).json({ error: '当日记录不存在' })
    res.json(dayLog)
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
    if (!name?.trim() || kcal == null || Number(kcal) <= 0) {
      return res.status(400).json({ error: '请填写名称和有效热量' })
    }
    const parsedBatch = parseOptionalBatchId(batch_id)
    if (parsedBatch.error) {
      return res.status(400).json({ error: parsedBatch.error })
    }
    const parsedMacros = parseMealMacroInput(req.body)
    if (parsedMacros.error) {
      return res.status(400).json({ error: parsedMacros.error })
    }
    const requestedSource = req.body.macros_source === 'ai' ? 'ai' : null
    const source = hasAnyMealMacro(parsedMacros.macros)
      ? requestedSource ?? 'user'
      : null
    const resolved = await resolveMealMacrosForSave({
      userId: req.userId,
      name: name.trim(),
      kcal,
      macros: parsedMacros.macros,
      source,
    })
    await query(
      `insert into meals
         (day_log_id, user_id, name, kcal, batch_id,
          protein_g, fat_g, carbs_g, sugar_g, sugar_scope, macros_source)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'added', $10)`,
      [
        day_log_id,
        req.userId,
        name.trim(),
        kcal,
        parsedBatch.batchId,
        resolved.macros.protein_g,
        resolved.macros.fat_g,
        resolved.macros.carbs_g,
        resolved.macros.sugar_g,
        resolved.source,
      ],
    )
    const { rows } = await query(`select * from day_logs where id = $1`, [
      day_log_id,
    ])
    const visibility = await afterDayLogIdChanged(req.userId, day_log_id, {
      mealChanged: true,
    })
    res.json({
      ...rows[0],
      community_visible: visibility?.community_visible,
      sugar_clamped: resolved.sugarClamped,
    })
  }),
)

router.post(
  '/meals/macros/backfill',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { log_date: logDate } = req.body ?? {}
    if (!isValidDateKey(logDate)) {
      return res.status(400).json({ error: '日期格式无效' })
    }

    const { rows } = await query(
      `select m.id, m.day_log_id, m.name, m.kcal,
              m.protein_g, m.fat_g, m.carbs_g, m.sugar_g,
              m.macros_source, m.sugar_scope
       from meals m
       join day_logs dl on dl.id = m.day_log_id
       where m.user_id = $1
         and dl.user_id = $1
         and dl.log_date = $2
         and m.sugar_scope is null
       order by m.created_at asc`,
      [req.userId, logDate],
    )

    let completed = 0
    let updated = 0
    await Promise.all(
      rows.map(async (meal) => {
        const preserveUserSugar =
          meal.macros_source === 'user' && meal.sugar_g != null
        if (preserveUserSugar) {
          const result = await query(
            `update meals set sugar_scope = 'added'
             where id = $1 and user_id = $2 and sugar_scope is null
             returning id`,
            [meal.id, req.userId],
          )
          if (result.rows[0]) {
            updated += 1
            completed += 1
          }
          return
        }

        const resolved = await resolveMealMacrosForSave({
          userId: req.userId,
          name: meal.name,
          kcal: meal.kcal,
          macros: {
            protein_g: meal.protein_g,
            fat_g: meal.fat_g,
            carbs_g: meal.carbs_g,
            // Legacy AI sugar used the total-sugar definition; never carry it over.
            sugar_g: null,
          },
          source: meal.macros_source === 'user' ? 'user' : null,
        })
        const result = await query(
          `update meals
           set protein_g = $1, fat_g = $2, carbs_g = $3, sugar_g = $4,
               sugar_scope = 'added', macros_source = $5
           where id = $6 and user_id = $7
             and sugar_scope is null
           returning id`,
          [
            resolved.macros.protein_g,
            resolved.macros.fat_g,
            resolved.macros.carbs_g,
            resolved.macros.sugar_g,
            resolved.source,
            meal.id,
            req.userId,
          ],
        )
        if (result.rows[0]) {
          updated += 1
          if (resolved.macros.sugar_g != null) completed += 1
        }
      }),
    )

    if (updated > 0 && rows[0]?.day_log_id) {
      await afterDayLogIdChanged(req.userId, rows[0].day_log_id)
    }
    res.json({ attempted: updated, completed })
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
    const existingResult = await query(
      `select * from meals where id = $1 and user_id = $2`,
      [req.params.id, req.userId],
    )
    const existing = existingResult.rows[0]
    if (!existing) return res.status(404).json({ error: '记录不存在' })

    const parsedMacros = parseMealMacroInput(req.body)
    if (parsedMacros.error) {
      return res.status(400).json({ error: parsedMacros.error })
    }
    const macros = Object.fromEntries(
      MEAL_MACRO_FIELDS.map((field) => [
        field,
        Object.prototype.hasOwnProperty.call(req.body, field)
          ? parsedMacros.macros[field]
          : field === 'sugar_g' &&
              existing.sugar_scope == null &&
              existing.macros_source === 'ai'
            ? null
          : existing[field],
      ]),
    )
    const requestedSource = req.body.macros_source === 'ai' ? 'ai' : null
    const source = parsedMacros.hasProvidedField
      ? hasAnyMealMacro(macros)
        ? requestedSource ?? 'user'
        : null
      : existing.macros_source
    const resolutionSource =
      existing.sugar_scope == null &&
      existing.macros_source === 'ai' &&
      !Object.prototype.hasOwnProperty.call(req.body, 'sugar_g')
        ? null
        : source
    const resolved = await resolveMealMacrosForSave({
      userId: req.userId,
      name: name.trim(),
      kcal,
      macros,
      source: resolutionSource,
    })

    const { rows } = await query(
      `update meals
       set name = $1, kcal = $2, protein_g = $3, fat_g = $4,
           carbs_g = $5, sugar_g = $6, sugar_scope = 'added', macros_source = $7
       where id = $8 and user_id = $9
       returning *`,
      [
        name.trim(),
        kcal,
        resolved.macros.protein_g,
        resolved.macros.fat_g,
        resolved.macros.carbs_g,
        resolved.macros.sugar_g,
        resolved.source,
        req.params.id,
        req.userId,
      ],
    )
    const visibility = await afterExerciseOrMealChanged(
      req.userId,
      req.params.id,
      'meals',
    )
    res.json({
      ...rows[0],
      community_visible: visibility?.community_visible,
      sugar_clamped: resolved.sugarClamped,
    })
  }),
)

router.delete(
  '/meals/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `delete from meals where id = $1 and user_id = $2
       returning day_log_id`,
      [req.params.id, req.userId],
    )
    if (!rows[0]) return res.status(404).json({ error: '记录不存在' })
    const visibility = await afterDayLogIdChanged(
      req.userId,
      rows[0].day_log_id,
      { mealChanged: true },
    )
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

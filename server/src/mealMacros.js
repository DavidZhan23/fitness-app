import { estimateMealMacrosFromDescription } from './ai/providers/deepseekText.js'
import { query } from './db.js'

export const MEAL_MACRO_FIELDS = [
  'protein_g',
  'fat_g',
  'carbs_g',
  'sugar_g',
]

const macroTaskChains = new Map()

const MAX_MACRO_GRAMS = 10_000

function roundGram(value) {
  return Math.round(value * 10) / 10
}

export function parseMealMacroInput(body) {
  const macros = {}
  let hasProvidedField = false

  for (const field of MEAL_MACRO_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(body ?? {}, field)) {
      macros[field] = null
      continue
    }
    hasProvidedField = true
    const raw = body[field]
    if (raw == null || raw === '') {
      macros[field] = null
      continue
    }
    const value = Number(raw)
    if (!Number.isFinite(value) || value < 0 || value > MAX_MACRO_GRAMS) {
      return { error: '营养素克数须为 0–10000 的数字' }
    }
    macros[field] = roundGram(value)
  }

  return { macros, hasProvidedField }
}

export function hasAnyMealMacro(macros) {
  return MEAL_MACRO_FIELDS.some((field) => macros?.[field] != null)
}

export function resolveMealMacrosSource(
  macros,
  { source = null, estimated = false, attemptedEstimate = false } = {},
) {
  if (hasAnyMealMacro(macros)) return source ?? (estimated ? 'ai' : null)
  if (attemptedEstimate) return source ?? 'ai'
  return source
}

export function fillMissingMealMacros(current, estimated) {
  return Object.fromEntries(
    MEAL_MACRO_FIELDS.map((field) => [
      field,
      current?.[field] ?? estimated?.[field] ?? null,
    ]),
  )
}

export function macrosFromEstimateItems(items) {
  if (!Array.isArray(items) || items.length === 0) return null
  const totals = Object.fromEntries(MEAL_MACRO_FIELDS.map((field) => [field, 0]))
  const seen = Object.fromEntries(MEAL_MACRO_FIELDS.map((field) => [field, false]))

  for (const item of items) {
    const quantity = Number(item?.quantity ?? 1)
    if (!Number.isFinite(quantity) || quantity <= 0) continue
    for (const field of MEAL_MACRO_FIELDS) {
      const value = Number(item?.[field])
      if (!Number.isFinite(value) || value < 0) continue
      totals[field] += value * quantity
      seen[field] = true
    }
  }

  const result = Object.fromEntries(
    MEAL_MACRO_FIELDS.map((field) => [
      field,
      seen[field] ? roundGram(totals[field]) : null,
    ]),
  )
  return hasAnyMealMacro(result) ? result : null
}

/**
 * When P/F/C are complete, scale their 4/9/4 energy to the saved meal kcal.
 * `sugar_g` tracks added/free sugar independently and is intentionally preserved.
 */
export function calibrateMealMacros(macros, kcal) {
  const next = fillMissingMealMacros(macros, null)
  const protein = next.protein_g
  const fat = next.fat_g
  const carbs = next.carbs_g
  const targetKcal = Number(kcal)

  if (
    protein != null &&
    fat != null &&
    carbs != null &&
    Number.isFinite(targetKcal) &&
    targetKcal > 0
  ) {
    const macroKcal = protein * 4 + carbs * 4 + fat * 9
    if (macroKcal > 0) {
      const scale = targetKcal / macroKcal
      next.protein_g = roundGram(protein * scale)
      next.fat_g = roundGram(fat * scale)
      next.carbs_g = roundGram(carbs * scale)
    }
  }

  return { macros: next, sugarClamped: false }
}

export function resolveMealMacrosForSave({ kcal, macros, source = null }) {
  const next = fillMissingMealMacros(macros, null)
  const calibrated = calibrateMealMacros(next, kcal)
  const missingAny = MEAL_MACRO_FIELDS.some(
    (field) => calibrated.macros[field] == null,
  )
  return {
    ...calibrated,
    source: hasAnyMealMacro(calibrated.macros) ? source ?? 'user' : source,
    macrosStatus: missingAny ? 'pending' : 'ready',
    needsBackgroundEstimate: missingAny,
  }
}

async function writeMealMacros(userId, mealId, { macros, source, status }) {
  await query(
    `update meals
     set protein_g = $3, fat_g = $4, carbs_g = $5, sugar_g = $6,
         sugar_scope = 'added', macros_source = $7, macros_status = $8
     where id = $1 and user_id = $2`,
    [
      mealId,
      userId,
      macros.protein_g,
      macros.fat_g,
      macros.carbs_g,
      macros.sugar_g,
      source,
      status,
    ],
  )
}

export async function estimateAndStoreMealMacros(userId, mealId) {
  const { rows } = await query(
    `select id, name, kcal, protein_g, fat_g, carbs_g, sugar_g, macros_source
     from meals where id = $1 and user_id = $2`,
    [mealId, userId],
  )
  const meal = rows[0]
  if (!meal) return

  const current = Object.fromEntries(
    MEAL_MACRO_FIELDS.map((field) => [field, meal[field]]),
  )
  if (!MEAL_MACRO_FIELDS.some((field) => current[field] == null)) {
    await query(
      `update meals set macros_status = 'ready'
       where id = $1 and user_id = $2`,
      [mealId, userId],
    )
    return
  }

  try {
    const profileResult = await query(
      `select weight_kg from profiles where id = $1`,
      [userId],
    )
    const estimated = macrosFromEstimateItems(
      (
        await estimateMealMacrosFromDescription({
          description: meal.name,
          profile: profileResult.rows[0] || {},
        })
      )?.items,
    )
    const filled = fillMissingMealMacros(current, estimated)
    const calibrated = calibrateMealMacros(filled, meal.kcal)
    const stillMissing = MEAL_MACRO_FIELDS.some(
      (field) => calibrated.macros[field] == null,
    )
    await writeMealMacros(userId, mealId, {
      macros: calibrated.macros,
      source: resolveMealMacrosSource(calibrated.macros, {
        source: meal.macros_source,
        estimated: estimated != null,
        attemptedEstimate: true,
      }),
      status: stillMissing ? 'error' : 'ready',
    })
  } catch (err) {
    console.warn(
      '[meal-macros] background estimate failed:',
      err?.code || err?.message || err,
    )
    await writeMealMacros(userId, mealId, {
      macros: current,
      source: resolveMealMacrosSource(current, {
        source: meal.macros_source,
        attemptedEstimate: true,
      }),
      status: 'error',
    })
  }
}

export function scheduleMealMacroEstimate(userId, mealId) {
  if (!userId || !mealId) return
  const key = `${userId}:${mealId}`
  const previous = macroTaskChains.get(key) ?? Promise.resolve()
  const task = previous
    .catch(() => undefined)
    .then(() => estimateAndStoreMealMacros(userId, mealId))
  macroTaskChains.set(key, task)
  void task
    .finally(() => {
      if (macroTaskChains.get(key) === task) macroTaskChains.delete(key)
    })
    .catch(() => undefined)
}

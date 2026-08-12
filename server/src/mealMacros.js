export const MEAL_MACRO_FIELDS = [
  'protein_g',
  'fat_g',
  'carbs_g',
  'sugar_g',
]

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

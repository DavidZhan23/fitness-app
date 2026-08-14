import { resolveProfileMetabolism } from './calories'
import type { Meal, MealMacrosInput, Profile } from '../types'
import { calculateMacroTargetsFromMetabolism } from '../../server/src/macroTargets.js'

export const MACRO_FIELDS = [
  'protein_g',
  'fat_g',
  'carbs_g',
  'sugar_g',
] as const

export type MacroField = (typeof MACRO_FIELDS)[number]

export interface MacroAmounts {
  protein_g: number
  fat_g: number
  carbs_g: number
  sugar_g: number
}

export interface MacroDraft {
  protein_g: string
  fat_g: string
  carbs_g: string
  sugar_g: string
}

export type MacroStatus = 'low' | 'near' | 'high'
export type MacroTargetTier = 'high-oil-sugar' | 'normal' | 'low-oil-sugar'

export const MACRO_TARGET_TIERS: {
  id: MacroTargetTier
  label: string
  description: string
}[] = [
  {
    id: 'high-oil-sugar',
    label: '较高油糖',
    description: '脂肪按体重 1.1g/kg；添加糖 50g 是宽松上限，不是鼓励吃满',
  },
  {
    id: 'normal',
    label: '正常油糖',
    description: '脂肪按性别与活动水平计算；添加糖以 25g 作为推荐目标',
  },
  {
    id: 'low-oil-sugar',
    label: '少油少糖',
    description: '每日脂肪 30g；添加糖 15g 是自选更严格目标，非官方独立标准',
  },
]

function roundGram(value: number): number {
  return Math.round(value * 10) / 10
}

function finiteNonNegative(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

export function parseMacroDraft(
  draft: MacroDraft,
):
  | { ok: true; macros: MealMacrosInput; sugarClamped: boolean }
  | { ok: false; error: string } {
  const macros: MealMacrosInput = {}
  for (const field of MACRO_FIELDS) {
    const raw = draft[field].trim()
    if (!raw) {
      macros[field] = null
      continue
    }
    const value = finiteNonNegative(raw)
    if (value == null || value > 10_000) {
      return { ok: false, error: '营养素克数须为 0–10000 的数字' }
    }
    macros[field] = roundGram(value)
  }

  if (MACRO_FIELDS.some((field) => macros[field] != null)) {
    macros.macros_source = 'user'
  }
  return { ok: true, macros, sugarClamped: false }
}

export function mealMacroDraft(meal?: Partial<Meal> | null): MacroDraft {
  return {
    protein_g: meal?.protein_g == null ? '' : String(meal.protein_g),
    fat_g: meal?.fat_g == null ? '' : String(meal.fat_g),
    carbs_g: meal?.carbs_g == null ? '' : String(meal.carbs_g),
    sugar_g: meal?.sugar_g == null ? '' : String(meal.sugar_g),
  }
}

export function summarizeMealMacros(meals: Meal[]): MacroAmounts {
  const totals: MacroAmounts = {
    protein_g: 0,
    fat_g: 0,
    carbs_g: 0,
    sugar_g: 0,
  }
  for (const meal of meals) {
    for (const field of MACRO_FIELDS) {
      if (field === 'sugar_g' && meal.sugar_scope !== 'added') continue
      totals[field] += finiteNonNegative(meal[field]) ?? 0
    }
  }
  for (const field of MACRO_FIELDS) totals[field] = roundGram(totals[field])
  return totals
}

export function needsMealMacroBackfill(meal: Meal): boolean {
  return meal.sugar_scope !== 'added'
}

export function isMealMacroEstimating(meal: Pick<Meal, 'macros_status'>): boolean {
  return meal.macros_status === 'pending'
}

export function isNutritionEstimateInProgress(
  dayLog: { micronutrient_status?: string | null } | null,
  meals: Pick<Meal, 'macros_status'>[],
): boolean {
  if (dayLog?.micronutrient_status === 'pending') return true
  return meals.some(isMealMacroEstimating)
}

export function macroEnergyKcal(
  macros: Pick<MacroAmounts, 'protein_g' | 'fat_g' | 'carbs_g'>,
): number {
  return macros.protein_g * 4 + macros.fat_g * 9 + macros.carbs_g * 4
}

/** Rule targets use profile energy needs, deficit goal, weight, sex and activity. */
export function calculateMacroTargets(
  profile: Profile | null,
  tier: MacroTargetTier = 'normal',
): MacroAmounts {
  const { tdee } = resolveProfileMetabolism(profile)
  return calculateMacroTargetsFromMetabolism(
    {
      sex: profile?.sex,
      weightKg: profile?.weight_kg,
      activityFactor: profile?.activity_factor,
      tdee,
      deficitThreshold: profile?.deficit_threshold,
    },
    tier,
  ) as MacroAmounts
}

export function compareMacroToTarget(actual: number, target: number): MacroStatus {
  if (target <= 0) return actual <= 0 ? 'near' : 'high'
  const relativeDiff = Math.abs(actual - target) / target
  if (relativeDiff <= 0.1) return 'near'
  return actual > target ? 'high' : 'low'
}

export const MACRO_STATUS_LABELS: Record<MacroStatus, string> = {
  low: '偏少',
  near: '接近',
  high: '偏多',
}

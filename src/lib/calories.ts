import type { Profile, Sex } from '../types'

/** 1 大卡 (kcal) = 4.184 千焦 (kJ) */
export const KJ_PER_KCAL = 4.184

/** 由食用克数与包装「千焦/100g」换算摄入热量 (kcal) */
export function kcalFromGramsAndKjPer100g(
  grams: number,
  kjPer100g: number,
): number {
  const g = Number(grams)
  const kj = Number(kjPer100g)
  if (!Number.isFinite(g) || !Number.isFinite(kj) || g <= 0 || kj <= 0) {
    return 0
  }
  return Math.round((g / 100) * (kj / KJ_PER_KCAL))
}

/** API / PG numeric 常为字符串，统一转为 kcal 数字 */
export function toKcal(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

export const ACTIVITY_LEVELS = [
  { value: 1.2, label: '久坐（几乎不运动）' },
  { value: 1.375, label: '轻度活动（每周 1–3 次）' },
  { value: 1.55, label: '中度活动（每周 3–5 次）' },
  { value: 1.725, label: '高强度（每周 6–7 次）' },
  { value: 1.9, label: '极高（体力劳动或每天训练）' },
] as const

/**
 * Mifflin-St Jeor 公式（美国营养与饮食学会推荐）
 * 男: BMR = 10×体重(kg) + 6.25×身高(cm) - 5×年龄 + 5
 * 女: BMR = 10×体重(kg) + 6.25×身高(cm) - 5×年龄 - 161
 */
export const BMR_FORMULA_NAME = 'Mifflin-St Jeor'

export function calculateBmr(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: Sex,
): number {
  const w = Number(weightKg)
  const h = Number(heightCm)
  const a = Number(age)
  const base = 10 * w + 6.25 * h - 5 * a
  return Math.round(sex === 'male' ? base + 5 : base - 161)
}

export function calculateTdee(bmr: number, activityFactor: number): number {
  return Math.round(bmr * (toKcal(activityFactor) || 1.2))
}

/** 根据资料用公式实时计算 BMR / TDEE（不依赖库里可能过期的存值） */
export function resolveProfileMetabolism(profile: Profile | null | undefined): {
  bmr: number
  tdee: number
} {
  if (!profile) return { bmr: 0, tdee: 0 }
  const w = toKcal(profile.weight_kg)
  const h = toKcal(profile.height_cm)
  const age = Number(profile.age)
  const sex = profile.sex
  const factor = toKcal(profile.activity_factor) || 1.2
  if (w > 0 && h > 0 && age > 0 && sex) {
    const bmr = calculateBmr(w, h, age, sex)
    return { bmr, tdee: calculateTdee(bmr, factor) }
  }
  return { bmr: toKcal(profile.bmr), tdee: toKcal(profile.tdee) }
}

export function calculateDeficit(
  tdee: number,
  exerciseKcal: number,
  mealKcal: number,
): number {
  return Math.round(
    toKcal(tdee) + toKcal(exerciseKcal) - toKcal(mealKcal),
  )
}

export function hasExerciseCheck(exerciseKcal: number, count?: number): boolean {
  return (count ?? 0) > 0 || exerciseKcal > 0
}

export function hasDeficitCheck(deficit: number, threshold: number): boolean {
  return deficit > threshold
}

/** 运动强度 0–4，用于月历颜色深浅 */
export function getExerciseIntensityLevel(kcal: number): 0 | 1 | 2 | 3 | 4 {
  kcal = toKcal(kcal)
  if (kcal <= 0) return 0
  if (kcal < 150) return 1
  if (kcal < 300) return 2
  if (kcal < 500) return 3
  return 4
}

export type DeficitHeatmapTone = 'neutral' | 'deficit' | 'surplus'

/** 超出阈值部分的强度 1–4（与缺口/盈余色阶对称） */
function deficitMagnitudeToLevel(magnitude: number): 0 | 1 | 2 | 3 | 4 {
  if (magnitude <= 0) return 0
  if (magnitude < 100) return 1
  if (magnitude < 300) return 2
  if (magnitude < 500) return 3
  return 4
}

/** 打卡格：绿=缺口、红=盈余，色阶与阈值对称 */
export function getDeficitHeatmapCell(
  deficit: number,
  threshold: number,
): { level: 0 | 1 | 2 | 3 | 4; tone: DeficitHeatmapTone } {
  deficit = toKcal(deficit)
  threshold = toKcal(threshold)
  if (deficit > threshold) {
    return {
      level: deficitMagnitudeToLevel(deficit - threshold),
      tone: 'deficit',
    }
  }
  if (deficit < -threshold) {
    return {
      level: deficitMagnitudeToLevel(-threshold - deficit),
      tone: 'surplus',
    }
  }
  return { level: 0, tone: 'neutral' }
}

export const EXERCISE_LEVEL_CLASSES = [
  'bg-slate-700/60',
  'bg-teal-900/80',
  'bg-teal-700',
  'bg-teal-500',
  'bg-teal-300',
] as const

/** 代谢缺口（绿，越深缺口越大） */
export const DEFICIT_LEVEL_CLASSES = [
  'bg-slate-700/60',
  'bg-emerald-900/80',
  'bg-emerald-700',
  'bg-emerald-500',
  'bg-emerald-300',
] as const

/** 热量盈余（红：level 1 浅 → level 4 深，盈余越大越深红） */
export const DEFICIT_SURPLUS_LEVEL_CLASSES = [
  'bg-slate-700/60',
  'bg-red-300',
  'bg-red-500',
  'bg-red-700',
  'bg-red-900/80',
] as const

export function getDeficitHeatmapClass(
  level: 0 | 1 | 2 | 3 | 4,
  tone: DeficitHeatmapTone,
): string {
  const palette =
    tone === 'surplus' ? DEFICIT_SURPLUS_LEVEL_CLASSES : DEFICIT_LEVEL_CLASSES
  return palette[level]
}

/** 运动/饮食热量展示（社区、今日、打卡等统一文案） */
export const EXERCISE_KCAL_STAT_LABEL = '运动消耗'
export const MEAL_KCAL_STAT_LABEL = '饮食增加'

export function formatExerciseKcalLine(kcal: number) {
  return `${EXERCISE_KCAL_STAT_LABEL} ${Math.round(kcal)} kcal`
}

export function formatMealKcalLine(kcal: number) {
  return `${MEAL_KCAL_STAT_LABEL} ${Math.round(kcal)} kcal`
}

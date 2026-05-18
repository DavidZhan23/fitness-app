import type { Sex } from '../types'

export const ACTIVITY_LEVELS = [
  { value: 1.2, label: '久坐（几乎不运动）' },
  { value: 1.375, label: '轻度活动（每周 1–3 次）' },
  { value: 1.55, label: '中度活动（每周 3–5 次）' },
  { value: 1.725, label: '高强度（每周 6–7 次）' },
  { value: 1.9, label: '极高（体力劳动或每天训练）' },
] as const

/** Mifflin-St Jeor BMR */
export function calculateBmr(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: Sex,
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return Math.round(sex === 'male' ? base + 5 : base - 161)
}

export function calculateTdee(bmr: number, activityFactor: number): number {
  return Math.round(bmr * activityFactor)
}

export function calculateDeficit(
  tdee: number,
  exerciseKcal: number,
  mealKcal: number,
): number {
  return Math.round(tdee + exerciseKcal - mealKcal)
}

export function hasExerciseCheck(exerciseKcal: number, count?: number): boolean {
  return (count ?? 0) > 0 || exerciseKcal > 0
}

export function hasDeficitCheck(deficit: number, threshold: number): boolean {
  return deficit > threshold
}

/** 运动强度 0–4，用于月历颜色深浅 */
export function getExerciseIntensityLevel(kcal: number): 0 | 1 | 2 | 3 | 4 {
  if (kcal <= 0) return 0
  if (kcal < 150) return 1
  if (kcal < 300) return 2
  if (kcal < 500) return 3
  return 4
}

/** 代谢缺口强度 0–4 */
export function getDeficitIntensityLevel(
  deficit: number,
  threshold: number,
): 0 | 1 | 2 | 3 | 4 {
  if (deficit <= threshold) return 0
  const excess = deficit - threshold
  if (excess < 100) return 1
  if (excess < 300) return 2
  if (excess < 500) return 3
  return 4
}

export const EXERCISE_LEVEL_CLASSES = [
  'bg-slate-700/60',
  'bg-teal-900/80',
  'bg-teal-700',
  'bg-teal-500',
  'bg-teal-300',
] as const

export const DEFICIT_LEVEL_CLASSES = [
  'bg-slate-700/60',
  'bg-emerald-900/80',
  'bg-emerald-700',
  'bg-emerald-500',
  'bg-emerald-300',
] as const

import { toKcal } from './calories'
import type { Profile, Sex } from '../types'

/** 发给后端的资料字段（去掉 NaN / null，避免 PG 报错） */
export function buildProfilePatchBody(
  data: Partial<Profile>,
  bmr: number | null,
  tdee: number | null,
): Record<string, string | number | boolean> {
  const body: Record<string, string | number | boolean> = {}

  const num = (v: unknown): number | undefined => {
    const n = Number(v)
    return Number.isFinite(n) ? n : undefined
  }

  const w = num(data.weight_kg)
  const h = num(data.height_cm)
  const a = num(data.age)
  if (w !== undefined && w > 0) body.weight_kg = w
  if (h !== undefined && h > 0) body.height_cm = h
  if (a !== undefined && a > 0) body.age = Math.round(a)

  if (data.sex === 'male' || data.sex === 'female') body.sex = data.sex

  const factor = num(data.activity_factor)
  if (factor !== undefined && factor >= 1 && factor <= 3) {
    body.activity_factor = Math.round(factor * 1000) / 1000
  }

  const threshold = num(data.deficit_threshold)
  if (threshold !== undefined) body.deficit_threshold = Math.round(threshold)

  if (data.onboarding_complete !== undefined) {
    body.onboarding_complete = Boolean(data.onboarding_complete)
  }

  if (bmr != null && bmr > 0) body.bmr = Math.round(bmr)
  if (tdee != null && tdee > 0) body.tdee = Math.round(tdee)

  return body
}

export function mergeProfileForCalc(
  data: Partial<Profile>,
  profile: Profile | null,
): {
  weight_kg: number
  height_cm: number
  age: number
  sex: Sex
  activity_factor: number
} | null {
  const w = toKcal(data.weight_kg ?? profile?.weight_kg)
  const h = toKcal(data.height_cm ?? profile?.height_cm)
  const age = Number(data.age ?? profile?.age)
  const sex = (data.sex ?? profile?.sex) as Sex | null
  const factor = toKcal(data.activity_factor ?? profile?.activity_factor) || 1.2
  if (w > 0 && h > 0 && age > 0 && (sex === 'male' || sex === 'female')) {
    return { weight_kg: w, height_cm: h, age, sex, activity_factor: factor }
  }
  return null
}

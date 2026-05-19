/** 服务端代谢计算（与前端 formulas 一致） */

export function toKcal(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

export function calculateBmr(weightKg, heightCm, age, sex) {
  const w = Number(weightKg)
  const h = Number(heightCm)
  const a = Number(age)
  const base = 10 * w + 6.25 * h - 5 * a
  return Math.round(sex === 'male' ? base + 5 : base - 161)
}

export function calculateTdee(bmr, activityFactor) {
  return Math.round(bmr * (toKcal(activityFactor) || 1.2))
}

export function resolveProfileBmr(profile) {
  if (!profile) return 0
  const w = toKcal(profile.weight_kg)
  const h = toKcal(profile.height_cm)
  const age = Number(profile.age)
  const sex = profile.sex
  const factor = toKcal(profile.activity_factor) || 1.2
  if (w > 0 && h > 0 && age > 0 && (sex === 'male' || sex === 'female')) {
    return calculateBmr(w, h, age, sex)
  }
  return toKcal(profile.bmr)
}

export function resolveProfileTdee(profile) {
  const bmr = resolveProfileBmr(profile)
  if (bmr > 0) return calculateTdee(bmr, profile.activity_factor)
  return toKcal(profile.tdee)
}

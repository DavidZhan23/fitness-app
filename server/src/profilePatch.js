/** 清洗 PATCH /profile 请求体，避免 NaN、非法枚举导致 500 */

const ALLOWED = [
  'nickname',
  'community_visible',
  'weight_kg',
  'height_cm',
  'age',
  'sex',
  'activity_factor',
  'bmr',
  'tdee',
  'deficit_threshold',
  'onboarding_complete',
]

export function buildProfileUpdate(body) {
  const updates = []
  const values = []
  let i = 1

  const push = (col, val) => {
    updates.push(`${col} = $${i++}`)
    values.push(val)
  }

  const num = (v) => {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }

  if (body.nickname !== undefined) {
    const raw = typeof body.nickname === 'string' ? body.nickname.trim() : ''
    push('nickname', raw ? raw.slice(0, 32) : null)
  }
  if (body.weight_kg !== undefined) {
    const w = num(body.weight_kg)
    if (w != null && w > 0) push('weight_kg', w)
  }
  if (body.height_cm !== undefined) {
    const h = num(body.height_cm)
    if (h != null && h > 0) push('height_cm', h)
  }
  if (body.age !== undefined) {
    const a = num(body.age)
    if (a != null && a > 0) push('age', Math.round(a))
  }
  if (body.sex === 'male' || body.sex === 'female') push('sex', body.sex)
  if (body.activity_factor !== undefined) {
    const f = num(body.activity_factor)
    if (f != null && f >= 1 && f <= 3) {
      push('activity_factor', Math.round(f * 1000) / 1000)
    }
  }
  if (body.bmr !== undefined) {
    const b = num(body.bmr)
    if (b != null && b > 0) push('bmr', Math.round(b))
  }
  if (body.tdee !== undefined) {
    const t = num(body.tdee)
    if (t != null && t > 0) push('tdee', Math.round(t))
  }
  if (body.deficit_threshold !== undefined) {
    const d = num(body.deficit_threshold)
    if (d != null) push('deficit_threshold', Math.round(d))
  }
  if (body.onboarding_complete !== undefined) {
    push('onboarding_complete', Boolean(body.onboarding_complete))
  }
  if (body.community_visible !== undefined) {
    push('community_visible', Boolean(body.community_visible))
  }

  return { updates, values, allowed: ALLOWED }
}

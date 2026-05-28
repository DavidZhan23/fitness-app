/** 清洗 PATCH /profile 请求体，避免 NaN、非法枚举导致 500 */

import { formatDateKeyInTz } from './dateKey.js'

const AVATAR_DATA_URL_MAX = 120_000

const AVATAR_DATA_URL_RE = /^data:image\/(jpeg|png|webp);base64,/

const ALLOWED = [
  'nickname',
  'avatar_url',
  'community_visible',
  'wall_style',
  'weight_kg',
  'height_cm',
  'age',
  'birthday',
  'sex',
  'activity_factor',
  'bmr',
  'tdee',
  'deficit_threshold',
  'onboarding_complete',
]

/** @param {unknown} value */
export function parseBirthdayKey(value) {
  if (typeof value !== 'string') return null
  const s = value.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const today = formatDateKeyInTz()
  if (s > today) return null
  return s
}

/** @param {string} birthdayKey YYYY-MM-DD */
export function ageFromBirthdayKey(birthdayKey) {
  const today = formatDateKeyInTz()
  const [by, bm, bd] = birthdayKey.split('-').map(Number)
  const [ty, tm, td] = today.split('-').map(Number)
  let age = ty - by
  if (tm < bm || (tm === bm && td < bd)) age -= 1
  return age > 0 && age < 150 ? age : null
}

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

  let parsedBirthday = null
  if (body.birthday !== undefined) {
    if (body.birthday === null || body.birthday === '') {
      push('birthday', null)
    } else {
      parsedBirthday = parseBirthdayKey(body.birthday)
      if (parsedBirthday) push('birthday', parsedBirthday)
    }
  }

  if (parsedBirthday) {
    const derivedAge = ageFromBirthdayKey(parsedBirthday)
    if (derivedAge != null) push('age', derivedAge)
  } else if (body.age !== undefined) {
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
  if (body.wall_style === 'classic' || body.wall_style === 'split') {
    push('wall_style', body.wall_style)
  }
  if (body.avatar_url !== undefined) {
    if (body.avatar_url === null || body.avatar_url === '') {
      push('avatar_url', null)
    } else if (typeof body.avatar_url === 'string') {
      const url = body.avatar_url.trim()
      if (
        AVATAR_DATA_URL_RE.test(url) &&
        url.length <= AVATAR_DATA_URL_MAX
      ) {
        push('avatar_url', url)
      }
    }
  }

  return { updates, values, allowed: ALLOWED }
}

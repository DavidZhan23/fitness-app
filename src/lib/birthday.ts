/** 生日与年龄（与 server/profilePatch 逻辑对齐，使用本地日历日） */

export function formatTodayDateKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseBirthdayKey(value: string): string | null {
  const s = value.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  if (s > formatTodayDateKey()) return null
  return s
}

export function ageFromBirthdayKey(birthdayKey: string): number | null {
  const today = formatTodayDateKey()
  const [by, bm, bd] = birthdayKey.split('-').map(Number)
  const [ty, tm, td] = today.split('-').map(Number)
  let age = ty - by
  if (tm < bm || (tm === bm && td < bd)) age -= 1
  return age > 0 && age < 150 ? age : null
}

/** 将 API 返回的 birthday（Date 或 ISO 字符串）规范为 YYYY-MM-DD */
export function normalizeBirthdayFromApi(raw: unknown): string | null {
  if (raw == null) return null
  if (raw instanceof Date) {
    if (Number.isNaN(raw.getTime())) return null
    return formatTodayDateKey(raw)
  }
  if (typeof raw !== 'string') return null

  const s = raw.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s

  const d = new Date(s)
  if (!Number.isNaN(d.getTime())) {
    return formatTodayDateKey(d)
  }

  return null
}

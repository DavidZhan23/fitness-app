/** 与前端一致的日历日（默认 Asia/Shanghai，Docker UTC 时避免「今日」错位） */
const TZ = process.env.DISPLAY_TIMEZONE || 'Asia/Shanghai'

export function formatDateKeyInTz(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

export function isValidDateKey(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)
}

/** 日历日加减（dateKey 为 YYYY-MM-DD） */
export function shiftDateKey(dateKey, days) {
  const d = new Date(`${dateKey}T12:00:00`)
  d.setDate(d.getDate() + days)
  return formatDateKeyInTz(d)
}

export function yesterdayDateKey(today = formatDateKeyInTz()) {
  return shiftDateKey(today, -1)
}

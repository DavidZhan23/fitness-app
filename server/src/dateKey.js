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

/** Return elapsed wall-clock minutes for a date in DISPLAY_TIMEZONE. */
export function getMinutesElapsedForDateInTz(dateKey, now = new Date()) {
  const today = formatDateKeyInTz(now)
  if (dateKey < today) return 24 * 60
  if (dateKey > today) return 0

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0)
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0)
  return Math.min(Math.max(hour * 60 + minute, 0), 24 * 60)
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

/** 是否为 DISPLAY_TIMEZONE 下的「今天」。历史日不得走后台 Pro。 */
export function isCurrentLogDate(logDate, now = new Date()) {
  const key = String(logDate ?? '').slice(0, 10)
  return isValidDateKey(key) && key === formatDateKeyInTz(now)
}

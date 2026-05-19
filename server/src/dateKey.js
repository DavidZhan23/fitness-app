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

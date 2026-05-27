import type { HeatmapDay } from '../types'

export function computeStreak(
  days: HeatmapDay[],
  type: 'exercise' | 'deficit',
): number {
  const sorted = [...days].sort((a, b) => b.date.localeCompare(a.date))
  const isOk = (day: HeatmapDay) =>
    type === 'exercise' ? day.exerciseCheck : day.deficitCheck

  // 从今天往回找；今天尚未打卡时，从最近一次达标日开始计连续天数
  let i = 0
  while (i < sorted.length && !isOk(sorted[i])) i++
  if (i >= sorted.length) return 0

  let streak = 0
  for (; i < sorted.length; i++) {
    if (isOk(sorted[i])) streak++
    else break
  }
  return streak
}

export function formatDateKey(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 统一 API 返回的 log_date（可能带时间或时区后缀）为本地日历 YYYY-MM-DD */
export function normalizeDateKey(value: string | Date): string {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return ''
    return formatDateKey(value)
  }
  const s = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const d = new Date(s)
  if (!Number.isNaN(d.getTime())) return formatDateKey(d)
  return s.slice(0, 10)
}

/** 打卡墙详情标题等展示用 */
export function formatDateKeyLabel(dateKey: string): string {
  const key = normalizeDateKey(dateKey)
  return parseDateKey(key).toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })
}

/** 账号起始日（注册日，本地时区 YYYY-MM-DD） */
export function getAccountStartDateKey(
  createdAt: string | null | undefined,
): string | null {
  if (!createdAt) return null
  const d = new Date(createdAt)
  if (Number.isNaN(d.getTime())) return null
  return formatDateKey(d)
}

export function isBeforeAccountStart(
  dateKey: string,
  accountStartKey: string | null,
): boolean {
  return Boolean(accountStartKey && dateKey < accountStartKey)
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function getLastNDays(n: number, end: Date = new Date()): string[] {
  const dates: string[] = []
  const cursor = new Date(end)
  for (let i = 0; i < n; i++) {
    dates.push(formatDateKey(cursor))
    cursor.setDate(cursor.getDate() - 1)
  }
  return dates.reverse()
}

export function getWeeksGrid(days: string[]): { weeks: string[][]; labels: string[] } {
  if (days.length === 0) return { weeks: [], labels: [] }

  const first = parseDateKey(days[0])
  const padStart = first.getDay()
  const padded: (string | null)[] = [...Array(padStart).fill(null), ...days]

  const weeks: string[][] = []
  for (let i = 0; i < padded.length; i += 7) {
    const week = padded.slice(i, i + 7).map((d) => d ?? '')
    while (week.length < 7) week.push('')
    weeks.push(week)
  }

  const labels = weeks.map((w) => {
    const firstDay = w.find((d) => d)
    if (!firstDay) return ''
    const dt = parseDateKey(firstDay)
    return `${dt.getMonth() + 1}月`
  })

  return { weeks, labels }
}

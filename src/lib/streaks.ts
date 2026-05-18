import type { HeatmapDay } from '../types'

export function computeStreak(
  days: HeatmapDay[],
  type: 'exercise' | 'deficit',
): number {
  const sorted = [...days].sort((a, b) => b.date.localeCompare(a.date))
  let streak = 0
  for (const day of sorted) {
    const ok = type === 'exercise' ? day.exerciseCheck : day.deficitCheck
    if (ok) streak++
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

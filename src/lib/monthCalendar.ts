export type IntensityLevel = 0 | 1 | 2 | 3 | 4

export function getTodayMonth(): { year: number; month: number } {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

export function shiftMonth(year: number, month: number, delta: number) {
  const d = new Date(year, month - 1 + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

export function formatMonthTitle(year: number, month: number): string {
  return `${year}年${month}月`
}

export function getMonthRange(year: number, month: number) {
  const mm = String(month).padStart(2, '0')
  const lastDay = new Date(year, month, 0).getDate()
  const dd = String(lastDay).padStart(2, '0')
  return {
    from: `${year}-${mm}-01`,
    to: `${year}-${mm}-${dd}`,
  }
}

/** 周一为第一列的月历网格 */
export function getMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month - 1, 1)
  const daysInMonth = new Date(year, month, 0).getDate()
  const startPad = (firstDay.getDay() + 6) % 7

  const cells: (string | null)[] = Array.from({ length: startPad }, () => null)
  const mm = String(month).padStart(2, '0')
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${mm}-${String(d).padStart(2, '0')}`)
  }
  while (cells.length % 7 !== 0) cells.push(null)

  const weeks: (string | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }

  return { weeks, daysInMonth }
}

export const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日']

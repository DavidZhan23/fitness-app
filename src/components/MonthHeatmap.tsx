import {
  DEFICIT_LEVEL_CLASSES,
  EXERCISE_LEVEL_CLASSES,
} from '../lib/calories'
import { getMonthGrid, WEEKDAY_LABELS } from '../lib/monthCalendar'
import { isBeforeAccountStart } from '../lib/streaks'

import type { MonthDayCell } from '../lib/monthData'

interface MonthHeatmapProps {
  year: number
  month: number
  dayMap: Map<string, MonthDayCell>
  todayKey: string
  accountStartKey?: string | null
  onDayClick?: (date: string) => void
}

export function MonthHeatmap({
  year,
  month,
  dayMap,
  todayKey,
  accountStartKey = null,
  onDayClick,
}: MonthHeatmapProps) {
  const { weeks } = getMonthGrid(year, month)

  return (
    <div className="space-y-5">
      <MonthGrid
        title="运动（越深运动越多）"
        weeks={weeks}
        dayMap={dayMap}
        todayKey={todayKey}
        accountStartKey={accountStartKey}
        type="exercise"
        levelClasses={EXERCISE_LEVEL_CLASSES}
        onDayClick={onDayClick}
      />
      <MonthGrid
        title="代谢缺口（越深缺口越大）"
        weeks={weeks}
        dayMap={dayMap}
        todayKey={todayKey}
        accountStartKey={accountStartKey}
        type="deficit"
        levelClasses={DEFICIT_LEVEL_CLASSES}
        onDayClick={onDayClick}
      />
    </div>
  )
}

function MonthGrid({
  title,
  weeks,
  dayMap,
  todayKey,
  accountStartKey,
  type,
  levelClasses,
  onDayClick,
}: {
  title: string
  weeks: (string | null)[][]
  dayMap: Map<string, MonthDayCell>
  todayKey: string
  accountStartKey: string | null
  type: 'exercise' | 'deficit'
  levelClasses: readonly string[]
  onDayClick?: (date: string) => void
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-slate-200">{title}</p>
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] text-muted">
        {WEEKDAY_LABELS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {weeks.flat().map((dateKey, i) => {
          if (!dateKey) {
            return (
              <div key={`empty-${i}`} className="aspect-square rounded-md" />
            )
          }
          const cell = dayMap.get(dateKey)
          const beforeAccount =
            type === 'deficit' && isBeforeAccountStart(dateKey, accountStartKey)
          const level = beforeAccount
            ? 0
            : type === 'exercise'
              ? (cell?.exerciseLevel ?? 0)
              : (cell?.deficitLevel ?? 0)
          const dayNum = parseInt(dateKey.slice(-2), 10)
          const isToday = dateKey === todayKey
          const isFuture = dateKey > todayKey

          const titleText = beforeAccount
            ? `${dateKey} 注册前，代谢缺口不计入`
            : cell
              ? type === 'exercise'
                ? `${dateKey} 运动 ${Math.round(cell.exerciseKcal)} kcal`
                : `${dateKey} 缺口 ${Math.round(cell.deficit)} kcal`
              : type === 'deficit' && accountStartKey && dateKey >= accountStartKey
                ? `${dateKey} 缺口 0 kcal`
                : `${dateKey} 无记录`

          return (
            <button
              key={dateKey}
              type="button"
              disabled={isFuture}
              title={titleText}
              onClick={() => !isFuture && onDayClick?.(dateKey)}
              className={`relative flex aspect-square items-center justify-center rounded-md text-[11px] font-medium tabular-nums transition-transform active:scale-95 ${
                levelClasses[level]
              } ${isFuture ? 'cursor-not-allowed opacity-30' : ''} ${
                isToday ? 'ring-2 ring-brand ring-offset-1 ring-offset-card' : ''
              } ${!isFuture && onDayClick ? 'hover:brightness-110' : ''}`}
            >
              {dayNum}
            </button>
          )
        })}
      </div>
      <Legend levelClasses={levelClasses} />
    </div>
  )
}

function Legend({ levelClasses }: { levelClasses: readonly string[] }) {
  return (
    <div className="mt-2 flex items-center justify-end gap-1.5 text-[10px] text-muted">
      <span>少</span>
      {levelClasses.map((cls, i) => (
        <div key={i} className={`h-3 w-3 rounded-sm ${cls}`} />
      ))}
      <span>多</span>
    </div>
  )
}

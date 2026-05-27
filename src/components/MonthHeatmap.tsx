import {
  DEFICIT_LEVEL_CLASSES,
  DEFICIT_SURPLUS_LEVEL_CLASSES,
  EXERCISE_LEVEL_CLASSES,
  getDeficitHeatmapClass,
} from '../lib/calories'
import { getMonthGrid, WEEKDAY_LABELS } from '../lib/monthCalendar'
import { isBeforeAccountStart } from '../lib/streaks'

import {
  heatmapBadgeEmoji,
  heatmapBadgeLabel,
} from '../lib/communityBadges'
import type { MonthDayCell } from '../lib/monthData'

export interface MonthHeatmapProps {
  year: number
  month: number
  dayMap: Map<string, MonthDayCell>
  todayKey: string
  accountStartKey?: string | null
  selectedDateKey?: string | null
  onDayClick?: (date: string) => void
}

export function MonthHeatmap({
  year,
  month,
  dayMap,
  todayKey,
  accountStartKey = null,
  selectedDateKey = null,
  onDayClick,
}: MonthHeatmapProps) {
  const { weeks } = getMonthGrid(year, month)

  return (
    <div className="space-y-5">
      <MonthGrid
        weeks={weeks}
        dayMap={dayMap}
        todayKey={todayKey}
        accountStartKey={accountStartKey}
        type="exercise"
        selectedDateKey={selectedDateKey}
        onDayClick={onDayClick}
      />
      <MonthGrid
        weeks={weeks}
        dayMap={dayMap}
        todayKey={todayKey}
        accountStartKey={accountStartKey}
        type="deficit"
        selectedDateKey={selectedDateKey}
        onDayClick={onDayClick}
      />
    </div>
  )
}

export type MonthGridType = 'exercise' | 'deficit'

export interface MonthGridProps {
  weeks: (string | null)[][]
  dayMap: Map<string, MonthDayCell>
  todayKey: string
  accountStartKey: string | null
  selectedDateKey?: string | null
  type: MonthGridType
  onDayClick?: (date: string) => void
}

export function MonthGrid({
  weeks,
  dayMap,
  todayKey,
  accountStartKey,
  selectedDateKey,
  type,
  onDayClick,
}: MonthGridProps) {
  return (
    <div>
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
          const isSelected =
            selectedDateKey != null &&
            dateKey === selectedDateKey &&
            !isToday
          const isFuture = dateKey > todayKey

          const cellClass =
            type === 'exercise'
              ? EXERCISE_LEVEL_CLASSES[level]
              : getDeficitHeatmapClass(level, cell?.deficitTone ?? 'neutral')

          const badgeLabel =
            type === 'deficit' && cell?.dayBadge
              ? heatmapBadgeLabel(cell.dayBadge)
              : null

          const titleText = beforeAccount
            ? `${formatTooltipDate(dateKey)} 注册之前不统计`
            : cell
              ? type === 'exercise'
                ? `${formatTooltipDate(dateKey)} 运动 ${Math.round(cell.exerciseKcal)} 千卡`
                : `${formatDeficitTooltip(dateKey, cell.deficit)}${badgeLabel ? ` · ${badgeLabel}` : ''}`
              : type === 'deficit' && accountStartKey && dateKey >= accountStartKey
                ? `${formatTooltipDate(dateKey)} 收支持平`
                : `${formatTooltipDate(dateKey)} 无记录`

          return (
            <button
              key={dateKey}
              type="button"
              disabled={isFuture}
              title={titleText}
              onClick={() => !isFuture && onDayClick?.(dateKey)}
              className={`relative flex aspect-square items-center justify-center rounded-md text-[11px] font-medium tabular-nums transition-transform active:scale-95 ${cellClass} ${
                isFuture ? 'cursor-not-allowed opacity-30' : ''
              } ${isToday ? 'ring-2 ring-brand ring-offset-1 ring-offset-card' : ''} ${
                isSelected
                  ? 'ring-2 ring-violet-400 ring-offset-1 ring-offset-card'
                  : ''
              } ${!isFuture && onDayClick ? 'hover:brightness-110' : ''}`}
            >
              {dayNum}
              {type === 'deficit' && cell?.dayBadge && (
                <span
                  className="pointer-events-none absolute right-0 top-0 flex h-3.5 min-w-3.5 items-center justify-center rounded-bl-md rounded-tr-md bg-slate-950/75 text-[8px] leading-none"
                  aria-hidden
                >
                  {heatmapBadgeEmoji(cell.dayBadge)}
                </span>
              )}
            </button>
          )
        })}
      </div>
      {type === 'exercise' ? (
        <Legend levelClasses={EXERCISE_LEVEL_CLASSES} />
      ) : (
        <DeficitLegend />
      )}
    </div>
  )
}

function formatTooltipDate(dateKey: string): string {
  const [, mm, dd] = dateKey.split('-')
  return `${Number(mm)}月${Number(dd)}日`
}

export function formatDeficitTooltip(dateKey: string, deficit: number): string {
  const label = formatTooltipDate(dateKey)
  const rounded = Math.round(deficit)
  if (rounded > 0) return `${label} 比消耗少吃了 ${rounded} 千卡`
  if (rounded < 0) return `${label} 比消耗多吃了 ${Math.abs(rounded)} 千卡`
  return `${label} 收支持平`
}

function Legend({ levelClasses }: { levelClasses: readonly string[] }) {
  return (
    <div className="mt-2 flex items-center justify-end gap-1.5 text-[10px] text-muted">
      <span className="shrink-0">运动量少</span>
      {levelClasses.map((cls, i) => (
        <div key={i} className={`h-3 w-3 shrink-0 rounded-sm ${cls}`} />
      ))}
      <span className="shrink-0">运动量多</span>
    </div>
  )
}

function DeficitLegendRow({
  labelStart,
  labelEnd,
  levelClasses,
}: {
  labelStart: string
  labelEnd: string
  levelClasses: readonly string[]
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <span>{labelStart}</span>
      {levelClasses.map((cls, i) => (
        <div key={i} className={`h-3 w-3 rounded-sm ${cls}`} />
      ))}
      <span>{labelEnd}</span>
    </div>
  )
}

function DeficitLegend() {
  const levels = [1, 2, 3, 4] as const
  return (
    <div className="mt-2 flex flex-col items-end gap-1 text-[10px] text-muted">
      <DeficitLegendRow
        labelStart="盈余少"
        labelEnd="盈余多"
        levelClasses={levels.map((l) => DEFICIT_SURPLUS_LEVEL_CLASSES[l])}
      />
      <DeficitLegendRow
        labelStart="缺口少"
        labelEnd="缺口多"
        levelClasses={levels.map((l) => DEFICIT_LEVEL_CLASSES[l])}
      />
    </div>
  )
}

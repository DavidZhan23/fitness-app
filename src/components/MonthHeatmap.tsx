import {
  DEFICIT_LEVEL_CLASSES,
  DEFICIT_SURPLUS_LEVEL_CLASSES,
  EXERCISE_LEVEL_CLASSES,
  getDeficitHeatmapClass,
  legendSwatchLevel,
  type WallLegendHighlight,
} from '../lib/calories'
import { getMonthGrid, WEEKDAY_LABELS } from '../lib/monthCalendar'
import { isBeforeAccountStart } from '../lib/streaks'

import {
  heatmapBadgeEmoji,
  heatmapBadgeLabel,
} from '../lib/communityBadges'
import type { MonthDayCell } from '../lib/monthData'
import { CalendarGrid, CalendarLegend } from './ui/responsive'

export interface MonthHeatmapProps {
  year: number
  month: number
  dayMap: Map<string, MonthDayCell>
  todayKey: string
  accountStartKey?: string | null
  selectedDateKey?: string | null
  legendHighlight?: WallLegendHighlight | null
  wallPane?: MonthGridType
  onWallPaneChange?: (pane: MonthGridType) => void
  onDayClick?: (date: string, gridType?: MonthGridType) => void
  selectedGridType?: MonthGridType | null
  /** 社区公开：代谢墙不显示 meal 提醒角标 */
  honorsOnly?: boolean
}

export function MonthHeatmap({
  year,
  month,
  dayMap,
  todayKey,
  accountStartKey = null,
  selectedDateKey = null,
  legendHighlight = null,
  selectedGridType = null,
  onDayClick,
  honorsOnly = false,
}: MonthHeatmapProps) {
  const { weeks } = getMonthGrid(year, month)

  return (
    <div className="space-y-5" data-heatmap-root>
      <MonthGrid
        weeks={weeks}
        dayMap={dayMap}
        todayKey={todayKey}
        accountStartKey={accountStartKey}
        type="exercise"
        selectedDateKey={selectedDateKey}
        legendHighlight={legendHighlight}
        selectedGridType={selectedGridType}
        onDayClick={onDayClick}
        honorsOnly={honorsOnly}
      />
      <MonthGrid
        weeks={weeks}
        dayMap={dayMap}
        todayKey={todayKey}
        accountStartKey={accountStartKey}
        type="deficit"
        selectedDateKey={selectedDateKey}
        legendHighlight={legendHighlight}
        selectedGridType={selectedGridType}
        onDayClick={onDayClick}
        honorsOnly={honorsOnly}
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
  legendHighlight?: WallLegendHighlight | null
  type: MonthGridType
  selectedGridType?: MonthGridType | null
  onDayClick?: (date: string, gridType?: MonthGridType) => void
  /** 社区公开：代谢墙不显示 meal 提醒角标 */
  honorsOnly?: boolean
}

export function MonthGrid({
  weeks,
  dayMap,
  todayKey,
  accountStartKey,
  selectedDateKey,
  legendHighlight = null,
  type,
  selectedGridType = null,
  onDayClick,
  honorsOnly = false,
}: MonthGridProps) {
  return (
    <div>
      <div className="responsive-calendar-weekdays mb-1 text-center text-[10px] text-muted">
        {WEEKDAY_LABELS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <CalendarGrid density="compact">
        {weeks.flat().map((dateKey, i) => {
          if (!dateKey) {
            return (
              <div key={`empty-${i}`} className="aspect-square rounded-md" />
            )
          }
          const cell = dayMap.get(dateKey)
          const beforeAccount = isBeforeAccountStart(dateKey, accountStartKey)
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
            (selectedGridType == null || selectedGridType === type)
          const isFuture = dateKey > todayKey
          const isBlocked = isFuture || beforeAccount

          const cellClass =
            type === 'exercise'
              ? EXERCISE_LEVEL_CLASSES[level]
              : getDeficitHeatmapClass(level, cell?.deficitTone ?? 'neutral')

          const rawGridBadge = beforeAccount
            ? null
            : type === 'exercise'
              ? cell?.exerciseDayBadge
              : cell?.deficitDayBadge
          const gridBadge =
            honorsOnly && rawGridBadge === 'meal' ? null : rawGridBadge
          const badgeLabel = gridBadge ? heatmapBadgeLabel(gridBadge) : null

          const titleText = beforeAccount
            ? `${formatTooltipDate(dateKey)} 注册之前不可查看`
            : cell
              ? type === 'exercise'
                ? `${formatTooltipDate(dateKey)} 运动 ${Math.round(cell.exerciseKcal)} 千卡`
                : `${formatDeficitTooltip(dateKey, cell.deficit)}${
                    cell.noMealBmrExcluded
                      ? ' · 该日未记饮食，缺口不含基础代谢'
                      : ''
                  }${badgeLabel ? ` · ${badgeLabel}` : ''}`
              : type === 'deficit' && accountStartKey && dateKey >= accountStartKey
                ? `${formatTooltipDate(dateKey)} 收支持平`
                : `${formatTooltipDate(dateKey)} 无记录`

          const ariaLabel = beforeAccount
            ? `${dayNum}日，注册之前不可查看`
            : isToday
              ? `${dayNum}日，今日`
              : `${dayNum}日`

          return (
            <button
              key={dateKey}
              type="button"
              disabled={isBlocked}
              data-heatmap-day={dateKey}
              data-heatmap-grid={type}
              title={isToday ? `${titleText} · 今日` : titleText}
              aria-label={ariaLabel}
              onClick={() => !isBlocked && onDayClick?.(dateKey, type)}
              className={`relative flex aspect-square items-center justify-center rounded-md text-[11px] font-medium tabular-nums transition-transform active:scale-95 ${cellClass} ${
                beforeAccount ? 'heatmap-day--before-account' : ''
              } ${
                isBlocked ? 'cursor-not-allowed opacity-30' : ''
              } ${isSelected ? 'heatmap-day--selected' : ''} ${
                !isBlocked && onDayClick ? 'hover:brightness-110' : ''
              }`}
            >
              {isToday && (
                <span className="heatmap-day-today-label" aria-hidden>
                  今日
                </span>
              )}
              {dayNum}
              {gridBadge && (
                <span
                  className="pointer-events-none absolute right-0 top-0 flex h-3.5 min-w-3.5 items-center justify-center rounded-bl-md rounded-tr-md bg-slate-950/75 text-[8px] leading-none"
                  aria-hidden
                >
                  {heatmapBadgeEmoji(gridBadge)}
                </span>
              )}
            </button>
          )
        })}
      </CalendarGrid>
      {type === 'exercise' ? (
        <Legend
          levelClasses={EXERCISE_LEVEL_CLASSES}
          activeSwatchIndex={
            legendHighlight
              ? legendSwatchLevel(legendHighlight.exerciseLevel)
              : undefined
          }
        />
      ) : (
        <DeficitLegend highlight={legendHighlight} />
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

function Legend({
  levelClasses,
  activeSwatchIndex,
}: {
  levelClasses: readonly string[]
  activeSwatchIndex?: number
}) {
  return (
    <CalendarLegend className="mt-2 justify-end text-[10px] text-muted">
      <span className="shrink-0">运动量少</span>
      {levelClasses.map((cls, i) => (
        <div
          key={i}
          className={`h-3 w-3 shrink-0 rounded-sm transition-transform ${cls} ${
            activeSwatchIndex === i ? 'heatmap-legend-swatch--active' : ''
          }`}
          aria-current={activeSwatchIndex === i ? true : undefined}
        />
      ))}
      <span className="shrink-0">运动量多</span>
    </CalendarLegend>
  )
}

function DeficitLegendRow({
  labelStart,
  labelEnd,
  levelClasses,
  activeLevel,
}: {
  labelStart: string
  labelEnd: string
  levelClasses: readonly string[]
  activeLevel?: 1 | 2 | 3 | 4
}) {
  const levels = [1, 2, 3, 4] as const
  return (
    <div className="flex shrink-0 items-center gap-1">
      <span>{labelStart}</span>
      {levelClasses.map((cls, i) => (
        <div
          key={i}
          className={`h-3 w-3 rounded-sm transition-transform ${cls} ${
            activeLevel === levels[i] ? 'heatmap-legend-swatch--active' : ''
          }`}
          aria-current={activeLevel === levels[i] ? true : undefined}
        />
      ))}
      <span>{labelEnd}</span>
    </div>
  )
}

function DeficitLegend({
  highlight,
}: {
  highlight?: WallLegendHighlight | null
}) {
  const levels = [1, 2, 3, 4] as const
  const activeLevel = highlight
    ? legendSwatchLevel(highlight.deficitLevel)
    : undefined
  const surplusActive =
    highlight?.deficitTone === 'surplus' ? activeLevel : undefined
  const deficitActive =
    highlight && highlight.deficitTone !== 'surplus' ? activeLevel : undefined

  return (
    <CalendarLegend className="mt-2 flex-col items-end text-[10px] text-muted">
      <DeficitLegendRow
        labelStart="盈余少"
        labelEnd="盈余多"
        levelClasses={levels.map((l) => DEFICIT_SURPLUS_LEVEL_CLASSES[l])}
        activeLevel={surplusActive}
      />
      <DeficitLegendRow
        labelStart="缺口少"
        labelEnd="缺口多"
        levelClasses={levels.map((l) => DEFICIT_LEVEL_CLASSES[l])}
        activeLevel={deficitActive}
      />
    </CalendarLegend>
  )
}

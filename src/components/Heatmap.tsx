import { getWeeksGrid } from '../lib/streaks'
import type { HeatmapDay } from '../types'

interface HeatmapProps {
  days: HeatmapDay[]
  type: 'exercise' | 'deficit'
  label: string
  activeColor: string
  onDayClick?: (date: string) => void
}

export function Heatmap({
  days,
  type,
  label,
  activeColor,
  onDayClick,
}: HeatmapProps) {
  const dayMap = new Map(days.map((d) => [d.date, d]))
  const sortedDates = [...days].sort((a, b) => a.date.localeCompare(b.date))
  const dateKeys = sortedDates.map((d) => d.date)
  const { weeks } = getWeeksGrid(dateKeys)

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-200">{label}</p>
      <div className="overflow-x-auto pb-1">
        <div className="inline-flex gap-[3px]">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((dateKey, di) => {
                if (!dateKey) {
                  return (
                    <div
                      key={`${wi}-${di}`}
                      className="h-[11px] w-[11px] rounded-sm bg-transparent"
                    />
                  )
                }
                const day = dayMap.get(dateKey)
                const active =
                  type === 'exercise' ? day?.exerciseCheck : day?.deficitCheck
                const title = day
                  ? `${dateKey}: ${
                      type === 'exercise'
                        ? active
                          ? '已运动'
                          : '未运动'
                        : active
                          ? `缺口 ${Math.round(day.deficit)}`
                          : '无缺口'
                    }`
                  : dateKey

                return (
                  <button
                    key={dateKey}
                    type="button"
                    title={title}
                    onClick={() => onDayClick?.(dateKey)}
                    className={`h-[11px] w-[11px] rounded-sm transition-colors ${
                      active ? activeColor : 'bg-slate-700/80'
                    } ${onDayClick ? 'hover:ring-1 hover:ring-white/30' : ''}`}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted">
        <span>少</span>
        <div className="flex gap-[3px]">
          <div className="h-[11px] w-[11px] rounded-sm bg-slate-700/80" />
          <div className={`h-[11px] w-[11px] rounded-sm ${activeColor}`} />
        </div>
        <span>多</span>
      </div>
    </div>
  )
}

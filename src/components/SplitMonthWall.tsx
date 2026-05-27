import { useState, type ReactNode } from 'react'
import { getMonthGrid } from '../lib/monthCalendar'
import {
  MonthGrid,
  type MonthGridType,
  type MonthHeatmapProps,
} from './MonthHeatmap'

export function SplitMonthWall({
  year,
  month,
  dayMap,
  todayKey,
  accountStartKey = null,
  selectedDateKey = null,
  onDayClick,
}: MonthHeatmapProps) {
  const [pane, setPane] = useState<MonthGridType>('exercise')
  const { weeks } = getMonthGrid(year, month)

  return (
    <div className="space-y-3">
      <div
        className="flex w-fit max-w-full rounded-xl bg-slate-800/80 p-1 ring-1 ring-slate-700/50"
        role="tablist"
        aria-label="打卡墙切换"
      >
        <WallPaneTab
          active={pane === 'exercise'}
          onClick={() => setPane('exercise')}
        >
          运动墙
        </WallPaneTab>
        <WallPaneTab
          active={pane === 'deficit'}
          onClick={() => setPane('deficit')}
        >
          代谢墙
        </WallPaneTab>
      </div>

      {pane === 'exercise' ? (
        <MonthGrid
          weeks={weeks}
          dayMap={dayMap}
          todayKey={todayKey}
          accountStartKey={accountStartKey}
          type="exercise"
          selectedDateKey={selectedDateKey}
          onDayClick={onDayClick}
        />
      ) : (
        <MonthGrid
          weeks={weeks}
          dayMap={dayMap}
          todayKey={todayKey}
          accountStartKey={accountStartKey}
          type="deficit"
          selectedDateKey={selectedDateKey}
          onDayClick={onDayClick}
        />
      )}
    </div>
  )
}

function WallPaneTab({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
        active
          ? 'bg-violet-600/40 text-violet-100 shadow-sm ring-1 ring-violet-500/30'
          : 'text-muted hover:text-slate-200'
      }`}
    >
      {children}
    </button>
  )
}

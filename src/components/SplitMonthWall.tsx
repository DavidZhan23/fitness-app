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
  legendHighlight = null,
  wallPane: wallPaneProp,
  onWallPaneChange,
  onDayClick,
}: MonthHeatmapProps) {
  const [internalPane, setInternalPane] = useState<MonthGridType>('exercise')
  const pane = wallPaneProp ?? internalPane
  const setPane = onWallPaneChange ?? setInternalPane
  const { weeks } = getMonthGrid(year, month)

  return (
    <div className="space-y-3">
      <div
        className="wall-pane-tabs flex w-fit max-w-full rounded-xl p-1"
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
          legendHighlight={legendHighlight}
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
          legendHighlight={legendHighlight}
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
      className={`wall-pane-tab rounded-lg px-4 py-2 text-sm font-medium transition ${
        active ? 'wall-pane-tab--active' : ''
      }`}
    >
      {children}
    </button>
  )
}

import { useAuth } from '../context/AuthContext'
import { hasDeficitCheck, toKcal } from '../lib/calories'
import {
  evaluateCommunityDayStatus,
  heatmapBadgeEmoji,
  heatmapBadgeLabel,
  listPublicHonorBadges,
  type PublicHonorBadge,
} from '../lib/communityBadges'
import { formatDeficitGoalStatus } from '../lib/deficitGoal'
import type { MonthGridType } from './MonthHeatmap'

const DEFICIT_MEAL_HINT = '未记录饮食，缺口可能偏高'
const HONOR_EMPTY_LABEL = '还没点亮称号'
const HONOR_MEAL_HINT = '补上饮食后数据会更准确'

export interface CalendarDayDetailPanelProps {
  dateKey: string
  gridType: MonthGridType
  deficit: number
  exerciseKcal: number
  mealKcal: number
  dailyBmr: number
  deficitThreshold?: number
  /** 社区公开：仅荣誉称号，不含 meal 提醒 */
  honorsOnly?: boolean
  onClose: () => void
  onEnterDayRecord?: (dateKey: string) => void
}

function formatPanelDateLine(dateKey: string): string {
  const [, mm, dd] = dateKey.split('-')
  return `${Number(mm)}月${Number(dd)}日`
}

function gridSourceLabel(grid: MonthGridType): string {
  return grid === 'exercise' ? '运动墙' : '热量墙'
}

function deficitToneClass(
  deficit: number,
  threshold: number,
): 'theme-deficit-value--positive' | 'theme-deficit-value--surplus' | 'theme-deficit-value--neutral' {
  const surplus = deficit < -threshold
  const positive = hasDeficitCheck(deficit, threshold)
  if (surplus) return 'theme-deficit-value--surplus'
  if (positive) return 'theme-deficit-value--positive'
  return 'theme-deficit-value--neutral'
}

export function CalendarDayDetailPanel({
  dateKey,
  gridType,
  deficit,
  exerciseKcal,
  mealKcal,
  dailyBmr,
  deficitThreshold,
  honorsOnly = false,
  onClose,
  onEnterDayRecord,
}: CalendarDayDetailPanelProps) {
  const { profile } = useAuth()
  const threshold =
    deficitThreshold != null
      ? toKcal(deficitThreshold)
      : toKcal(profile?.deficit_threshold)

  const badgeInput = { deficit, exerciseKcal, mealKcal, dailyBmr }
  const { needsMealLog } = evaluateCommunityDayStatus(badgeInput)
  const honorBadges = listPublicHonorBadges(badgeInput)
  const deficitClass = deficitToneClass(deficit, threshold)

  const dateLine = formatPanelDateLine(dateKey)
  const headerTitle = `${dateLine} · ${gridSourceLabel(gridType)}`

  const showDeficitMealHint =
    !honorsOnly && needsMealLog && mealKcal <= 0
  const showHonorMealHint =
    !honorsOnly && needsMealLog && honorBadges.length === 0

  const roundedDeficit = Math.round(deficit)
  const compactDigits = Math.abs(roundedDeficit).toString().length >= 5
  const deficitUnitLabel = formatDeficitGoalStatus(deficit, threshold).unitLabel

  return (
    <section
      className="calendar-day-detail-panel"
      role="region"
      aria-label={`${dateLine}打卡详情`}
      data-testid="calendar-day-detail-panel"
    >
      <div className="calendar-day-detail-panel__header">
        <p className="calendar-day-detail-panel__title">{headerTitle}</p>
        <button
          type="button"
          className="calendar-day-detail-panel__close"
          onClick={onClose}
          aria-label="关闭当日详情"
        >
          <span className="calendar-day-detail-panel__close-icon" aria-hidden>
            ×
          </span>
        </button>
      </div>

      <div className="calendar-day-detail-panel__main">
        <section
          className="calendar-day-detail-panel__honor-card"
          aria-label="当日称号"
        >
          <h3 className="calendar-day-detail-panel__section-title">当日称号</h3>
          {honorBadges.length > 0 ? (
            <ul className="calendar-day-detail-panel__honor-list">
              {honorBadges.map((badge) => (
                <HonorRow key={badge} badge={badge} />
              ))}
            </ul>
          ) : (
            <>
              <p className="calendar-day-detail-panel__honor-empty">
                {HONOR_EMPTY_LABEL}
              </p>
              {showHonorMealHint ? (
                <p className="calendar-day-detail-panel__honor-hint">
                  {HONOR_MEAL_HINT}
                </p>
              ) : null}
            </>
          )}
        </section>

        <section
          className="calendar-day-detail-panel__data-card"
          aria-label="当日数据"
        >
          <h3 className="calendar-day-detail-panel__section-title">当日数据</h3>

          <div className="calendar-day-detail-panel__deficit-line">
            <span
              className={`calendar-day-detail-panel__deficit-value tabular-nums theme-deficit-value ${deficitClass}${compactDigits ? ' theme-deficit-value--compact' : ''}`}
            >
              {roundedDeficit > 0 ? '+' : ''}
              {roundedDeficit}
            </span>
            <span className="calendar-day-detail-panel__deficit-unit">
              {deficitUnitLabel}
            </span>
          </div>

          {showDeficitMealHint ? (
            <p className="calendar-day-detail-panel__deficit-hint">
              {DEFICIT_MEAL_HINT}
            </p>
          ) : null}

          <div
            className="calendar-day-detail-panel__behavior"
            aria-label="行为数据"
          >
            <span className="calendar-day-detail-panel__behavior-chip calendar-day-detail-panel__behavior-chip--exercise tabular-nums">
              运动 {Math.round(exerciseKcal)} kcal
            </span>
            <span className="calendar-day-detail-panel__behavior-chip calendar-day-detail-panel__behavior-chip--meal tabular-nums">
              饮食 {Math.round(mealKcal)} kcal
            </span>
          </div>

          {onEnterDayRecord ? (
            <button
              type="button"
              className="calendar-day-detail-panel__enter-record"
              onClick={() => onEnterDayRecord(dateKey)}
            >
              进入当日记录
            </button>
          ) : null}
        </section>
      </div>
    </section>
  )
}

function HonorRow({ badge }: { badge: PublicHonorBadge }) {
  return (
    <li className="calendar-day-detail-panel__honor-item">
      <span className={`community-pill community-pill--${badge}`}>
        <span aria-hidden>{heatmapBadgeEmoji(badge)}</span>
        {heatmapBadgeLabel(badge)}
      </span>
    </li>
  )
}

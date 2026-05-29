import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../context/AuthContext'
import { hasDeficitCheck, toKcal } from '../lib/calories'
import type { MonthGridType } from './MonthHeatmap'
import {
  heatmapBadgeEmoji,
  heatmapBadgeLabel,
  listDayBadges,
  listPublicHonorBadges,
  type HeatmapDayBadge,
} from '../lib/communityBadges'
import {
  computeDayBadgePopoverPosition,
  domRectToRect,
  resolveAvoidRectFromAnchor,
} from '../lib/dayBadgePopoverPosition'

const BADGE_BLURBS: Record<HeatmapDayBadge, string> = {
  champion: '高强度训练 + 充足饮食，硬核一天',
  elite: '热量缺口达成，减脂节奏不错',
  foodKing: '今日饮食达到基础代谢 1.2 倍',
  meal: '今天还没记录饮食，数据可能不完整',
}

export interface DayBadgePopoverProps {
  open: boolean
  anchorEl: HTMLElement | null
  anchorGrid: MonthGridType
  dateKey: string
  todayKey: string
  deficit: number
  exerciseKcal: number
  mealKcal: number
  bmr: number
  tdee: number
  deficitThreshold?: number
  /** 社区公开：仅荣誉称号，不含 meal 提醒 */
  honorsOnly?: boolean
  onClose: () => void
}

function formatPopoverDateLine(dateKey: string): string {
  const [, mm, dd] = dateKey.split('-')
  return `${Number(mm)}月${Number(dd)}日`
}

function gridSourceLabel(grid: MonthGridType): string {
  return grid === 'exercise' ? '运动墙' : '代谢墙'
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

export function DayBadgePopover({
  open,
  anchorEl,
  anchorGrid,
  dateKey,
  todayKey: _todayKey,
  deficit,
  exerciseKcal,
  mealKcal,
  bmr,
  tdee,
  deficitThreshold,
  honorsOnly = false,
  onClose,
}: DayBadgePopoverProps) {
  const { profile } = useAuth()
  const threshold =
    deficitThreshold != null
      ? toKcal(deficitThreshold)
      : toKcal(profile?.deficit_threshold)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ left: number; top: number } | null>(
    null,
  )

  const badgeInput = { deficit, exerciseKcal, mealKcal, dailyBmr: bmr }
  const honorBadges = honorsOnly ? listPublicHonorBadges(badgeInput) : null
  const allBadges = honorBadges ?? listDayBadges(badgeInput)
  const primaryBadge: HeatmapDayBadge | null =
    honorBadges?.[0] ?? allBadges.find((badge) => badge !== 'meal') ?? null
  const deficitClass = deficitToneClass(deficit, threshold)

  const updatePosition = useCallback(() => {
    if (!open || !anchorEl || !popoverRef.current) {
      setPosition(null)
      return
    }
    const anchorRect = domRectToRect(anchorEl.getBoundingClientRect())
    const avoidRect = resolveAvoidRectFromAnchor(anchorEl)
    const { width, height } = popoverRef.current.getBoundingClientRect()
    const w = width > 0 ? width : popoverRef.current.offsetWidth
    const h = height > 0 ? height : popoverRef.current.offsetHeight
    setPosition(
      computeDayBadgePopoverPosition({
        anchorRect,
        avoidRect,
        popoverWidth: w,
        popoverHeight: h,
      }),
    )
  }, [open, anchorEl])

  useLayoutEffect(() => {
    updatePosition()
  }, [
    updatePosition,
    dateKey,
    anchorGrid,
    deficit,
    exerciseKcal,
    mealKcal,
    allBadges.length,
    primaryBadge,
  ])

  useEffect(() => {
    if (!open) return

    const onResize = () => updatePosition()
    window.addEventListener('resize', onResize)
    window.visualViewport?.addEventListener('resize', onResize)
    window.visualViewport?.addEventListener('scroll', onResize)

    const main = document.querySelector('.app-main')
    main?.addEventListener('scroll', onResize, true)

    return () => {
      window.removeEventListener('resize', onResize)
      window.visualViewport?.removeEventListener('resize', onResize)
      window.visualViewport?.removeEventListener('scroll', onResize)
      main?.removeEventListener('scroll', onResize, true)
    }
  }, [open, updatePosition])

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (popoverRef.current?.contains(target)) return
      if (anchorEl?.contains(target)) return
      onClose()
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, anchorEl, onClose])

  if (!open || !anchorEl) return null

  const dateLine = formatPopoverDateLine(dateKey)
  const headerTitle = `${dateLine} · ${gridSourceLabel(anchorGrid)}`
  const ariaLabel = `${dateLine}打卡详情`

  return createPortal(
    <div
      ref={popoverRef}
      role="dialog"
      aria-label={ariaLabel}
      data-testid="day-badge-popover"
      className="day-badge-popover"
      style={{
        position: 'fixed',
        left: position?.left ?? -9999,
        top: position?.top ?? -9999,
        visibility: position ? 'visible' : 'hidden',
      }}
    >
      <div className="day-badge-popover__header">
        <p className="day-badge-popover__title">{headerTitle}</p>
        <button
          type="button"
          className="day-badge-popover__close"
          onClick={onClose}
          aria-label="关闭称号详情"
        >
          <span aria-hidden>×</span>
        </button>
      </div>

      <div className="day-badge-popover__hero">
        {primaryBadge ? (
          <>
            <p className="day-badge-popover__hero-title">
              <span aria-hidden>{heatmapBadgeEmoji(primaryBadge)}</span>
              {heatmapBadgeLabel(primaryBadge)}
            </p>
            <p className="day-badge-popover__blurb">{BADGE_BLURBS[primaryBadge]}</p>
          </>
        ) : (
          <>
            <p className="day-badge-popover__hero-title day-badge-popover__hero-title--empty">
              暂无称号
            </p>
            <p className="day-badge-popover__blurb">
              继续记录，下一次就能点亮它。
            </p>
          </>
        )}
      </div>

      {allBadges.length > 1 && (
        <ul className="day-badge-popover__pills">
          {allBadges.map((badge) => (
            <BadgePill key={badge} badge={badge} />
          ))}
        </ul>
      )}

      <section className="day-badge-popover__metrics" aria-label="当日指标">
        <div className="day-badge-popover__deficit-panel">
          <span className="day-badge-popover__deficit-label">缺口</span>
          <span
            className={`day-badge-popover__deficit-value tabular-nums theme-deficit-value ${deficitClass}`}
          >
            {deficit > 0 ? '+' : ''}
            {Math.round(deficit)} kcal
          </span>
        </div>

        <div className="day-badge-popover__metric-row">
          <span className="day-badge-popover__metric-chip day-badge-popover__metric-chip--exercise">
            运动 {Math.round(exerciseKcal)} kcal
          </span>
          <span className="day-badge-popover__metric-chip day-badge-popover__metric-chip--meal">
            饮食 {Math.round(mealKcal)} kcal
          </span>
        </div>

        <dl className="day-badge-popover__explain-list">
          <div className="day-badge-popover__explain-row">
            <dt>基础代谢（BMR）</dt>
            <dd className="tabular-nums">{Math.round(bmr)} kcal</dd>
          </div>
          <div className="day-badge-popover__explain-row">
            <dt>全日消耗（TDEE）</dt>
            <dd className="tabular-nums">{Math.round(tdee)} kcal</dd>
          </div>
        </dl>
      </section>
    </div>,
    document.body,
  )
}

function BadgePill({ badge }: { badge: HeatmapDayBadge }) {
  const pillClass = {
    champion: 'community-pill community-pill--champion',
    elite: 'community-pill community-pill--elite',
    foodKing: 'community-pill community-pill--foodKing',
    meal: 'community-pill community-pill--meal',
  } as const

  return (
    <li>
      <span className={`${pillClass[badge]} text-[10px]`}>
        <span aria-hidden>{heatmapBadgeEmoji(badge)}</span>
        {heatmapBadgeLabel(badge)}
      </span>
    </li>
  )
}

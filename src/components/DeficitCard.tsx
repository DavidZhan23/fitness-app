import { useState } from 'react'
import {
  EXERCISE_KCAL_STAT_LABEL,
  MEAL_KCAL_STAT_LABEL,
} from '../lib/calories'
import {
  deficitGoalValueTone,
  formatClearCalorieResult,
  formatDeficitGoalStatus,
} from '../lib/deficitGoal'
import { BasalMetabolismSheet } from './BasalMetabolismSheet'
import { CalculationExplanationSheet } from './CalculationExplanationSheet'
import {
  FluidText,
  MetricRow,
  ResponsiveCard,
  StatsGrid,
} from './ui/responsive'
import type { Profile } from '../types'

interface DeficitCardProps {
  dateLabel: string
  deficit: number
  metabolismKcal: number
  metabolismLabel: string
  exerciseKcal: number
  mealKcal: number
  threshold: number
  /** 全日基础代谢 BMR（Mifflin-St Jeor） */
  fullDayBmr?: number
  /** 今日页：显示「？」计算解释入口 */
  showExplanationButton?: boolean
  /** 今日页：点击「基础代谢」展示 BMR 说明 */
  showMetabolismDetail?: boolean
  /** 今日页：使用明确的热量方向文案，并显示体重等价值 */
  showClearCalorieResult?: boolean
  profile?: Profile | null
}

export function DeficitCard({
  dateLabel,
  deficit,
  metabolismKcal,
  metabolismLabel,
  exerciseKcal,
  mealKcal,
  threshold,
  fullDayBmr = 0,
  showExplanationButton = false,
  showMetabolismDetail = false,
  showClearCalorieResult = false,
  profile = null,
}: DeficitCardProps) {
  const [explanationOpen, setExplanationOpen] = useState(false)
  const [metabolismSheetOpen, setMetabolismSheetOpen] = useState(false)
  const metabolismDetailEnabled = showMetabolismDetail && profile != null
  const unitLabel = formatDeficitGoalStatus(deficit, threshold).unitLabel
  const valueTone = deficitGoalValueTone(deficit, threshold)
  const roundedDeficit = Math.round(deficit)
  const compactDigits = Math.abs(roundedDeficit).toString().length >= 5
  const clearCalorieResult = formatClearCalorieResult(deficit)

  const valueClass =
    valueTone === 'surplus'
      ? 'theme-deficit-value--surplus'
      : valueTone === 'positive'
        ? 'theme-deficit-value--positive'
        : 'theme-deficit-value--neutral'

  return (
    <>
      <ResponsiveCard className="theme-hero-card theme-deficit-card p-6">
        <FluidText as="p" variant="body" className="text-base text-muted">
          {dateLabel}
        </FluidText>
        <MetricRow className="theme-deficit-main theme-deficit-main--inline mt-3">
          {showClearCalorieResult ? (
            <FluidText
              as="span"
              variant="body"
              className={`theme-deficit-result-label ${valueClass}`}
            >
              {clearCalorieResult.label}
            </FluidText>
          ) : null}
          <span
            className={`theme-deficit-value responsive-fluid-metric font-bold tabular-nums ${valueClass}${
              compactDigits ? ' theme-deficit-value--compact' : ''
            }`}
          >
            {showClearCalorieResult
              ? clearCalorieResult.value
              : roundedDeficit > 0
                ? `+${roundedDeficit}`
                : roundedDeficit}
          </span>
          <FluidText
            as="span"
            variant="body"
            className="theme-deficit-unit text-muted"
          >
            {showClearCalorieResult ? 'kcal' : unitLabel}
          </FluidText>
          {showExplanationButton ? (
            <button
              type="button"
              className="theme-deficit-explain-btn"
              aria-label="了解热量缺口怎么算"
              onClick={() => setExplanationOpen(true)}
            >
              ?
            </button>
          ) : null}
        </MetricRow>
        {showClearCalorieResult ? (
          <FluidText
            as="p"
            variant="body"
            className="theme-deficit-weight-equivalent text-muted"
          >
            {clearCalorieResult.weightEquivalentText}
          </FluidText>
        ) : null}
        <StatsGrid className="theme-deficit-stats mt-5 text-center text-base">
          <Stat
            label={metabolismLabel}
            value={metabolismKcal}
            variant="base"
            clickable={metabolismDetailEnabled}
            onClick={
              metabolismDetailEnabled
                ? () => setMetabolismSheetOpen(true)
                : undefined
            }
            clickAriaLabel="了解基础代谢怎么算"
          />
          <Stat label={EXERCISE_KCAL_STAT_LABEL} value={exerciseKcal} variant="exercise" />
          <Stat label={MEAL_KCAL_STAT_LABEL} value={mealKcal} variant="meal" />
        </StatsGrid>
      </ResponsiveCard>
      {showExplanationButton ? (
        <CalculationExplanationSheet
          open={explanationOpen}
          onClose={() => setExplanationOpen(false)}
        />
      ) : null}
      {metabolismDetailEnabled && profile ? (
        <BasalMetabolismSheet
          open={metabolismSheetOpen}
          onClose={() => setMetabolismSheetOpen(false)}
          accumulatedKcal={metabolismKcal}
          fullDayBmr={fullDayBmr}
          profile={profile}
        />
      ) : null}
    </>
  )
}

function Stat({
  label,
  value,
  variant,
  clickable = false,
  onClick,
  clickAriaLabel,
}: {
  label: string
  value: number
  variant: 'base' | 'exercise' | 'meal'
  clickable?: boolean
  onClick?: () => void
  clickAriaLabel?: string
}) {
  const className = `theme-hero-stat theme-deficit-stat theme-hero-stat--${variant} px-2 py-2.5${
    clickable ? ' theme-deficit-stat--clickable' : ''
  }`

  const content = (
    <>
      <FluidText
        as="p"
        variant="body"
        className="theme-hero-stat__label theme-deficit-stat__label responsive-wrap text-base text-muted"
      >
        {label}
      </FluidText>
      <span className="theme-hero-stat__divider" aria-hidden />
      <FluidText
        as="p"
        variant="body"
        className="theme-hero-stat__value theme-deficit-stat__value mt-1 tabular-nums"
      >
        {Math.round(value)} kcal
      </FluidText>
    </>
  )

  if (clickable && onClick) {
    return (
      <div
        role="button"
        tabIndex={0}
        className={className}
        aria-label={clickAriaLabel}
        onClick={onClick}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onClick()
          }
        }}
      >
        {content}
      </div>
    )
  }

  return <div className={className}>{content}</div>
}

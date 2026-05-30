import { useState } from 'react'
import {
  EXERCISE_KCAL_STAT_LABEL,
  MEAL_KCAL_STAT_LABEL,
} from '../lib/calories'
import {
  deficitGoalValueTone,
  formatDeficitGoalStatus,
} from '../lib/deficitGoal'
import { DeficitGoalSheet } from './DeficitGoalSheet'
import {
  FluidText,
  MetricRow,
  ResponsiveCard,
  StatsGrid,
} from './ui/responsive'

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
}

export function DeficitCard({
  dateLabel,
  deficit,
  metabolismKcal,
  metabolismLabel,
  exerciseKcal,
  mealKcal,
  threshold,
}: DeficitCardProps) {
  const [goalSheetOpen, setGoalSheetOpen] = useState(false)
  const goalStatus = formatDeficitGoalStatus(deficit, threshold)
  const valueTone = deficitGoalValueTone(deficit, threshold)
  const roundedDeficit = Math.round(deficit)
  const compactDigits = Math.abs(roundedDeficit).toString().length >= 5

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
          <span
            className={`theme-deficit-value responsive-fluid-metric font-bold tabular-nums ${valueClass}${
              compactDigits ? ' theme-deficit-value--compact' : ''
            }`}
          >
            {roundedDeficit > 0 ? '+' : ''}
            {roundedDeficit}
          </span>
          <FluidText
            as="span"
            variant="body"
            className="theme-deficit-unit text-muted"
          >
            {goalStatus.unitLabel}
          </FluidText>
        </MetricRow>
        <div className="theme-deficit-goal-panel mt-2">
          <p className="theme-deficit-goal-status">{goalStatus.message}</p>
          <button
            type="button"
            className="theme-deficit-goal-adjust"
            aria-label="调整目标缺口"
            onClick={() => setGoalSheetOpen(true)}
          >
            调整
          </button>
        </div>
        <StatsGrid className="theme-deficit-stats mt-5 text-center text-base">
          <Stat label={metabolismLabel} value={metabolismKcal} variant="base" />
          <Stat label={EXERCISE_KCAL_STAT_LABEL} value={exerciseKcal} variant="exercise" />
          <Stat label={MEAL_KCAL_STAT_LABEL} value={mealKcal} variant="meal" />
        </StatsGrid>
      </ResponsiveCard>
      <DeficitGoalSheet
        open={goalSheetOpen}
        currentThreshold={threshold}
        onClose={() => setGoalSheetOpen(false)}
      />
    </>
  )
}

function Stat({
  label,
  value,
  variant,
}: {
  label: string
  value: number
  variant: 'base' | 'exercise' | 'meal'
}) {
  return (
    <div className={`theme-hero-stat theme-deficit-stat theme-hero-stat--${variant} px-2 py-2.5`}>
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
    </div>
  )
}

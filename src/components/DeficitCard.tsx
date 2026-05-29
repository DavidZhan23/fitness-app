import {
  EXERCISE_KCAL_STAT_LABEL,
  MEAL_KCAL_STAT_LABEL,
  hasDeficitCheck,
} from '../lib/calories'
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
  fullDayBmr,
}: DeficitCardProps) {
  const positive = hasDeficitCheck(deficit, threshold)
  const surplus = deficit < -threshold

  return (
    <ResponsiveCard className="theme-hero-card theme-deficit-card p-6">
      <FluidText as="p" variant="body" className="text-base text-muted">
        {dateLabel}
      </FluidText>
      <MetricRow className="theme-deficit-main mt-3">
        <span
          className={`theme-deficit-value responsive-fluid-metric font-bold tabular-nums ${
            surplus
              ? 'theme-deficit-value--surplus'
              : positive
                ? 'theme-deficit-value--positive'
                : 'theme-deficit-value--neutral'
          }`}
        >
          {deficit > 0 ? '+' : ''}
          {Math.round(deficit)}
        </span>
        <FluidText as="span" variant="body" className="theme-deficit-unit text-muted">
          kcal 缺口
        </FluidText>
      </MetricRow>
      <FluidText as="p" variant="body" className="mt-2 text-base text-muted">
        {positive ? '已达成代谢缺口' : '摄入偏多，继续加油'}
        {fullDayBmr != null && fullDayBmr > 0 && (
          <span className="block mt-0.5">
            {/* 基础代谢 BMR 按分钟累计（全日约 {Math.round(fullDayBmr)} kcal） */}
          </span>
        )}
      </FluidText>
      <StatsGrid className="theme-deficit-stats mt-5 text-center text-base">
        <Stat label={metabolismLabel} value={metabolismKcal} variant="base" />
        <Stat label={EXERCISE_KCAL_STAT_LABEL} value={exerciseKcal} variant="exercise" />
        <Stat label={MEAL_KCAL_STAT_LABEL} value={mealKcal} variant="meal" />
      </StatsGrid>
    </ResponsiveCard>
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

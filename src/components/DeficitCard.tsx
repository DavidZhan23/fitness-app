import {
  EXERCISE_KCAL_STAT_LABEL,
  MEAL_KCAL_STAT_LABEL,
  hasDeficitCheck,
} from '../lib/calories'

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
    <section className="theme-hero-card p-5">
      <p className="text-sm text-muted">{dateLabel}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <span
          className={`theme-deficit-value text-4xl font-bold tabular-nums ${
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
        <span className="text-lg text-muted">kcal 缺口</span>
      </div>
      <p className="mt-1 text-xs text-muted">
        {positive ? '已达成代谢缺口' : '摄入偏多，继续加油'}
        {fullDayBmr != null && fullDayBmr > 0 && (
          <span className="block mt-0.5">
            {/* 基础代谢 BMR 按分钟累计（全日约 {Math.round(fullDayBmr)} kcal） */}
          </span>
        )}
      </p>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
        <Stat label={metabolismLabel} value={metabolismKcal} variant="base" />
        <Stat label={EXERCISE_KCAL_STAT_LABEL} value={exerciseKcal} variant="exercise" />
        <Stat label={MEAL_KCAL_STAT_LABEL} value={mealKcal} variant="meal" />
      </div>
    </section>
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
    <div className={`theme-hero-stat theme-hero-stat--${variant} px-2 py-2`}>
      <p className="text-xs text-muted">{label}</p>
      <p className="theme-hero-stat__value mt-0.5 font-semibold tabular-nums">
        {Math.round(value)} kcal
      </p>
    </div>
  )
}

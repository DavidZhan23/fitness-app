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
    <section className="theme-hero-card p-6">
      <p className="text-base text-muted">{dateLabel}</p>
      <div className="mt-3 flex items-baseline gap-3">
        <span
          className={`theme-deficit-value text-[3.9rem] font-bold tabular-nums leading-none ${
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
        <span className="text-[1.55rem] leading-none text-muted">kcal 缺口</span>
      </div>
      <p className="mt-2 text-base text-muted">
        {positive ? '已达成代谢缺口' : '摄入偏多，继续加油'}
        {fullDayBmr != null && fullDayBmr > 0 && (
          <span className="block mt-0.5">
            {/* 基础代谢 BMR 按分钟累计（全日约 {Math.round(fullDayBmr)} kcal） */}
          </span>
        )}
      </p>
      <div className="mt-5 grid grid-cols-3 gap-3 text-center text-base">
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
    <div className={`theme-hero-stat theme-hero-stat--${variant} px-2 py-2.5`}>
      <p className="theme-hero-stat__label text-base text-muted">{label}</p>
      <span className="theme-hero-stat__divider" aria-hidden />
      <p className="theme-hero-stat__value mt-1 tabular-nums">
        {Math.round(value)} kcal
      </p>
    </div>
  )
}

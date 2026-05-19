import { hasDeficitCheck } from '../lib/calories'

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

  return (
    <section className="rounded-2xl bg-gradient-to-br from-teal-900/60 to-slate-800/80 p-5 ring-1 ring-teal-500/20">
      <p className="text-sm text-muted">{dateLabel}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <span
          className={`text-4xl font-bold tabular-nums ${
            positive ? 'text-emerald-400' : 'text-amber-400'
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
        <Stat label={metabolismLabel} value={metabolismKcal} />
        <Stat label="运动" value={exerciseKcal} accent />
        <Stat label="饮食" value={mealKcal} />
      </div>
    </section>
  )
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent?: boolean
}) {
  return (
    <div className="rounded-xl bg-slate-900/50 px-2 py-2">
      <p className="text-xs text-muted">{label}</p>
      <p
        className={`mt-0.5 font-semibold tabular-nums ${
          accent ? 'text-brand' : 'text-slate-100'
        }`}
      >
        {Math.round(value)}
      </p>
    </div>
  )
}

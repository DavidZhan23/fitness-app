import { hasDeficitCheck } from '../lib/calories'
import {
  getAccumulatedMetabolism,
  getMetabolismStatLabel,
} from '../lib/metabolism'
import type { CommunityDaySnapshot } from '../types'

interface CommunityDaySummaryProps {
  snapshot: CommunityDaySnapshot
  dateLabel: string
  todayKey: string
}

export function CommunityDaySummary({
  snapshot,
  dateLabel,
  todayKey,
}: CommunityDaySummaryProps) {
  const {
    deficit,
    exerciseKcal,
    mealKcal,
    dailyBmr,
    threshold,
    date,
    exerciseCount,
    mealCount,
  } = snapshot
  const metabolismKcal = getAccumulatedMetabolism(
    dailyBmr,
    date,
    date === todayKey ? new Date() : new Date(`${date}T23:59:59`),
  )
  const positive = hasDeficitCheck(deficit, threshold)
  const surplus = deficit < -threshold

  return (
    <section
      className={`rounded-2xl p-5 ring-1 ${
        surplus
          ? 'bg-gradient-to-br from-red-950/50 to-slate-800/80 ring-red-500/25'
          : positive
            ? 'bg-gradient-to-br from-teal-900/60 to-slate-800/80 ring-teal-500/20'
            : 'bg-gradient-to-br from-slate-800/90 to-slate-900/90 ring-slate-600/40'
      }`}
    >
      <p className="text-sm text-muted">{dateLabel}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <span
          className={`text-4xl font-bold tabular-nums ${
            surplus ? 'text-red-400' : positive ? 'text-emerald-400' : 'text-amber-400'
          }`}
        >
          {deficit > 0 ? '+' : ''}
          {Math.round(deficit)}
        </span>
        <span className="text-lg text-muted">kcal 缺口</span>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg bg-black/20 px-2 py-2">
          <dt className="text-muted">{getMetabolismStatLabel(date, todayKey)}</dt>
          <dd className="mt-0.5 font-semibold tabular-nums text-slate-200">
            {Math.round(metabolismKcal)}
          </dd>
        </div>
        <div className="rounded-lg bg-black/20 px-2 py-2">
          <dt className="text-muted">运动</dt>
          <dd className="mt-0.5 font-semibold tabular-nums text-teal-300">
            {Math.round(exerciseKcal)}
            {exerciseCount > 0 && (
              <span className="ml-0.5 font-normal text-muted">·{exerciseCount}项</span>
            )}
          </dd>
        </div>
        <div className="rounded-lg bg-black/20 px-2 py-2">
          <dt className="text-muted">饮食</dt>
          <dd className="mt-0.5 font-semibold tabular-nums text-amber-300">
            {Math.round(mealKcal)}
            {mealCount > 0 && (
              <span className="ml-0.5 font-normal text-muted">·{mealCount}项</span>
            )}
          </dd>
        </div>
      </dl>
    </section>
  )
}

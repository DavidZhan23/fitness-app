import { Link } from 'react-router-dom'
import {
  evaluateCommunityDayStatus,
  heatmapBadgeEmoji,
  type CommunityDayBadge,
} from '../lib/communityBadges'
import { computeCommunityDeficit } from '../lib/communityDeficit'
import type { CommunityDaySnapshot, Profile } from '../types'

interface CommunityDayStatusProps {
  snapshot: CommunityDaySnapshot
  viewerProfile?: Profile | null
  isSelf?: boolean
  /** full：用户主页；compact：列表卡片；inline：摘要内嵌 */
  variant?: 'full' | 'compact' | 'inline'
}

export function CommunityDayStatus({
  snapshot,
  viewerProfile,
  isSelf,
  variant = 'full',
}: CommunityDayStatusProps) {
  const deficit = computeCommunityDeficit(snapshot, {
    viewerProfile,
    isSelf,
  })
  const status = evaluateCommunityDayStatus({
    deficit,
    exerciseKcal: snapshot.exerciseKcal,
    mealKcal: snapshot.mealKcal,
  })

  if (!status.needsMealLog && !status.badge) return null

  if (variant === 'compact') {
    return (
      <div className="flex flex-wrap gap-1.5">
        {status.badge === 'champion' && (
          <CompactPill kind="champion" label="运动大王" />
        )}
        {status.badge === 'elite' && (
          <CompactPill kind="elite" label="减脂先锋" />
        )}
        {status.needsMealLog && (
          <CompactPill kind="meal" label="记得记饮食" />
        )}
      </div>
    )
  }

  if (variant === 'inline') {
    return (
      <div className="mt-4 space-y-2">
        {status.badge && (
          <BadgeBanner
            badge={status.badge}
            deficit={deficit}
            exerciseKcal={snapshot.exerciseKcal}
            mealKcal={snapshot.mealKcal}
            compact
          />
        )}
        {status.needsMealLog && (
          <MealReminderCard isSelf={isSelf} compact />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {status.badge === 'champion' && (
        <BadgeBanner
          badge="champion"
          deficit={deficit}
          exerciseKcal={snapshot.exerciseKcal}
          mealKcal={snapshot.mealKcal}
        />
      )}
      {status.badge === 'elite' && (
        <BadgeBanner
          badge="elite"
          deficit={deficit}
          exerciseKcal={snapshot.exerciseKcal}
          mealKcal={snapshot.mealKcal}
        />
      )}
      {status.needsMealLog && <MealReminderCard isSelf={isSelf} />}
    </div>
  )
}

/** 今日页 / 个人打卡：与社区相同规则 */
export function PersonalDayStatus({
  deficit,
  exerciseKcal,
  mealKcal,
}: {
  deficit: number
  exerciseKcal: number
  mealKcal: number
}) {
  const status = evaluateCommunityDayStatus({
    deficit,
    exerciseKcal,
    mealKcal,
  })
  if (!status.needsMealLog && !status.badge) return null

  return (
    <div className="space-y-3">
      {status.badge === 'champion' && (
        <BadgeBanner
          badge="champion"
          deficit={deficit}
          exerciseKcal={exerciseKcal}
          mealKcal={mealKcal}
        />
      )}
      {status.badge === 'elite' && (
        <BadgeBanner
          badge="elite"
          deficit={deficit}
          exerciseKcal={exerciseKcal}
          mealKcal={mealKcal}
        />
      )}
      {status.needsMealLog && <MealReminderCard isSelf />}
    </div>
  )
}

function CompactPill({
  kind,
  label,
}: {
  kind: 'champion' | 'elite' | 'meal'
  label: string
}) {
  const styles = {
    champion:
      'bg-gradient-to-r from-amber-500/25 to-orange-600/20 text-amber-200 ring-amber-400/40',
    elite:
      'bg-gradient-to-r from-violet-500/25 to-cyan-500/20 text-violet-200 ring-violet-400/40',
    meal: 'bg-amber-900/35 text-amber-200/95 ring-amber-500/35',
  } as const

  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-px text-[9px] font-semibold ring-1 ${styles[kind]}`}
    >
      <span aria-hidden>{heatmapBadgeEmoji(kind)}</span>
      {label}
    </span>
  )
}

function BadgeBanner({
  badge,
  deficit,
  exerciseKcal,
  mealKcal,
  compact = false,
}: {
  badge: CommunityDayBadge
  deficit: number
  exerciseKcal: number
  mealKcal: number
  compact?: boolean
}) {
  const isChampion = badge === 'champion'

  if (compact) {
    return (
      <div
        className={`relative overflow-hidden rounded-xl px-3 py-2 ring-1 ${
          isChampion
            ? 'bg-gradient-to-r from-amber-950/80 via-orange-950/60 to-amber-900/50 ring-amber-500/35'
            : 'bg-gradient-to-r from-violet-950/80 via-indigo-950/60 to-cyan-950/50 ring-violet-500/35'
        }`}
      >
        <p className="flex items-center gap-2 text-xs font-semibold">
          <span className="text-base" aria-hidden>
            {isChampion ? '👑' : '🔥'}
          </span>
          {isChampion ? '运动大王' : '减脂先锋'}
          <span className="ml-auto tabular-nums text-[10px] font-normal text-slate-400">
            缺口 +{Math.round(deficit)}
          </span>
        </p>
      </div>
    )
  }

  return (
    <section
      className={`relative overflow-hidden rounded-2xl p-4 ring-1 ${
        isChampion
          ? 'bg-gradient-to-br from-amber-600/25 via-orange-700/20 to-amber-950/60 ring-amber-400/45 shadow-lg shadow-amber-900/25'
          : 'bg-gradient-to-br from-violet-600/25 via-indigo-700/20 to-cyan-950/50 ring-violet-400/40 shadow-lg shadow-violet-900/20'
      }`}
    >
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/5 blur-2xl"
        aria-hidden
      />
      <div className="relative flex items-start gap-3">
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl ${
            isChampion
              ? 'bg-amber-500/30 ring-1 ring-amber-400/50'
              : 'bg-violet-500/30 ring-1 ring-violet-400/50'
          }`}
          aria-hidden
        >
          {isChampion ? '👑' : '🔥'}
        </span>
        <div className="min-w-0 flex-1">
          <p
            className={`text-lg font-bold tracking-tight ${
              isChampion ? 'text-amber-100' : 'text-violet-100'
            }`}
          >
            {isChampion ? '运动大王' : '减脂先锋'}
          </p>
          <p className="mt-0.5 text-sm text-slate-300/90">
            {isChampion
              ? '高强度训练 + 充足饮食，真正的硬核一天！'
              : '热量缺口拉满，社区里的缺口达人。'}
          </p>
          <dl className="mt-3 flex flex-wrap gap-2 text-[11px]">
            <StatChip label="缺口" value={`+${Math.round(deficit)}`} />
            <StatChip label="运动" value={`${Math.round(exerciseKcal)}`} />
            {isChampion && (
              <StatChip label="饮食" value={`${Math.round(mealKcal)}`} />
            )}
          </dl>
        </div>
      </div>
    </section>
  )
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-lg bg-black/25 px-2 py-1 text-slate-300">
      <span className="text-muted">{label} </span>
      <span className="font-semibold tabular-nums text-slate-100">{value}</span>
    </span>
  )
}

function MealReminderCard({
  isSelf,
  compact = false,
}: {
  isSelf?: boolean
  compact?: boolean
}) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-950/40 px-3 py-2 text-xs text-amber-100/95">
        <span className="text-base" aria-hidden>
          🍽️
        </span>
        <span>
          缺口不错，但还没记饮食哦～
          {isSelf ? ' 补录一下更准' : ' 提醒 TA 吃饭'}
        </span>
      </div>
    )
  }

  return (
    <section className="rounded-2xl border border-amber-500/35 bg-gradient-to-br from-amber-950/50 to-slate-900/80 p-4 ring-1 ring-amber-500/25">
      <div className="flex items-start gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-xl ring-1 ring-amber-400/40"
          aria-hidden
        >
          🍽️
        </span>
        <div>
          <p className="font-semibold text-amber-100">记得记饮食</p>
          <p className="mt-1 text-sm leading-relaxed text-amber-200/85">
            今天缺口看起来不错，但饮食还是 0 千卡。
            {isSelf
              ? ' 把吃了什么记下来，缺口才算真实，也方便健友给你点赞～'
              : ' 友善提醒：补录饮食后，数据会更准确哦。'}
          </p>
          {isSelf && (
            <Link
              to="/log/meal"
              className="mt-3 inline-block rounded-lg bg-amber-600/90 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-500"
            >
              去记饮食
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}

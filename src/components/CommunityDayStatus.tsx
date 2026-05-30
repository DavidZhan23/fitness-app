import { Link } from 'react-router-dom'
import {
  BADGE_THRESHOLDS,
  evaluateCommunityDayStatus,
  heatmapBadgeEmoji,
  listPublicHonorBadges,
  type CommunityDayBadge,
  type PublicHonorBadge,
} from '../lib/communityBadges'
import {
  EXERCISE_KCAL_STAT_LABEL,
  MEAL_KCAL_STAT_LABEL,
  formatMealKcalLine,
} from '../lib/calories'
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
    dailyBmr: snapshot.dailyBmr,
  })
  const showMealReminder = status.needsMealLog && isSelf

  if (!showMealReminder && !status.badge && !status.foodKing) return null

  if (variant === 'compact') {
    if (!status.badge && !status.foodKing) return null

    return (
      <div className="community-day-status-compact flex flex-nowrap items-center gap-1.5 overflow-x-auto">
        {status.badge === 'champion' && (
          <CompactPill kind="champion" label="运动大王" />
        )}
        {status.badge === 'elite' && (
          <CompactPill kind="elite" label="减脂先锋" />
        )}
        {status.foodKing && (
          <CompactPill kind="foodKing" label="美食大王" />
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
        {status.foodKing && (
          <FoodKingBanner
            mealKcal={snapshot.mealKcal}
            dailyBmr={snapshot.dailyBmr}
            compact
          />
        )}
        {showMealReminder && (
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
      {status.foodKing && (
        <FoodKingBanner
          mealKcal={snapshot.mealKcal}
          dailyBmr={snapshot.dailyBmr}
        />
      )}
      {showMealReminder && <MealReminderCard isSelf={isSelf} />}
    </div>
  )
}

/** 今日页 / 个人打卡：与社区相同规则 */
export function PersonalDayStatus({
  deficit,
  exerciseKcal,
  mealKcal,
  dailyBmr,
  variant = 'full',
}: {
  deficit: number
  exerciseKcal: number
  mealKcal: number
  dailyBmr: number
  variant?: 'full' | 'side' | 'compact'
}) {
  const status = evaluateCommunityDayStatus({
    deficit,
    exerciseKcal,
    mealKcal,
    dailyBmr,
  })

  if (variant === 'compact') {
    const badgeInput = { deficit, exerciseKcal, mealKcal, dailyBmr }
    const honors = listPublicHonorBadges(badgeInput)

    if (honors.length > 0) {
      return (
        <div className="today-status-strips">
          {honors.map((key) => (
            <TodayStatusStrip
              key={key}
              {...TODAY_HONOR_STRIP[key]}
              badgeLabel="今日已点亮"
            />
          ))}
        </div>
      )
    }

    if (status.needsMealLog) {
      return (
        <TodayStatusStrip
          icon="🍽️"
          desc="今天还没记录饮食，补上后数据会更准确"
          tone="reminder"
          reminder
          badgeLabel="继续记录"
        />
      )
    }
    return (
      <TodayStatusStrip
        icon="✨"
        desc="继续记录，下一次就能点亮它"
        tone="empty"
        badgeLabel="继续记录"
      />
    )
  }

  if (!status.needsMealLog && !status.badge && !status.foodKing) return null

  if (variant === 'side') {
    const items: {
      icon: string
      title: string
      desc: string
      tone: 'exercise' | 'meal'
    }[] = []
    if (status.badge === 'champion') {
      items.push({
        icon: '👑',
        title: '运动大王',
        desc: '高强度训练 + 充足饮食，硬核一天',
        tone: 'exercise',
      })
    }
    if (status.badge === 'elite') {
      items.push({
        icon: '🔥',
        title: '减脂先锋',
        desc: '热量缺口拉满，缺口达人',
        tone: 'exercise',
      })
    }
    if (status.foodKing) {
      items.push({
        icon: '🥘',
        title: '美食大王',
        desc: '今日饮食达基础代谢 1.2 倍',
        tone: 'meal',
      })
    }
    if (status.needsMealLog) {
      items.push({
        icon: '🍽️',
        title: '记得记饮食',
        desc: '缺口不错，补录饮食更准确',
        tone: 'meal',
      })
    }

    return (
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <SideAchievementCard key={item.title} {...item} />
        ))}
      </div>
    )
  }

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
      {status.foodKing && (
        <FoodKingBanner mealKcal={mealKcal} dailyBmr={dailyBmr} />
      )}
      {status.needsMealLog && <MealReminderCard isSelf />}
    </div>
  )
}

type TodayStripTone = 'champion' | 'elite' | 'foodKing' | 'empty' | 'reminder'

const TODAY_HONOR_STRIP: Record<
  PublicHonorBadge,
  {
    icon: string
    title: string
    desc: string
    tone: TodayStripTone
  }
> = {
  champion: {
    icon: '👑',
    title: '运动大王',
    desc: '训练、补给、缺口都在线，今天很硬核',
    tone: 'champion',
  },
  elite: {
    icon: '🔥',
    title: '减脂先锋',
    desc: '当前缺口已超过 500 kcal，今天的节奏很稳',
    tone: 'elite',
  },
  foodKing: {
    icon: '🥘',
    title: '美食大王',
    desc: '饮食补给已拉满，今天吃得很认真',
    tone: 'foodKing',
  },
}

function TodayStatusStrip({
  icon,
  title,
  desc,
  reminder = false,
  tone = 'empty',
  badgeLabel,
}: {
  icon: string
  title?: string
  desc: string
  reminder?: boolean
  tone?: TodayStripTone
  badgeLabel?: string
}) {
  return (
    <div
      className={`today-status-strip personal-day-status--today-compact today-status-strip--${tone}${reminder ? ' today-status-strip--reminder' : ''}`}
      role="status"
    >
      <div className="today-status-strip__icon" aria-hidden>
        {icon}
      </div>
      <div className="today-status-strip__content">
        {title ? (
          <div className="today-status-strip__title">{title}</div>
        ) : null}
        <div className="today-status-strip__desc">{desc}</div>
      </div>
      {badgeLabel ? (
        <div className="today-status-strip__badge">{badgeLabel}</div>
      ) : null}
    </div>
  )
}

function SideAchievementCard({
  icon,
  title,
  desc,
  tone,
}: {
  icon: string
  title: string
  desc: string
  tone: 'exercise' | 'meal'
}) {
  return (
    <section
      className={`achievement-card achievement-card--${tone}`}
    >
      <div className="achievement-card__icon" aria-hidden>
        <span>{icon}</span>
      </div>
      <p className="achievement-card__title">{title}</p>
      <p className="achievement-card__desc">{desc}</p>
    </section>
  )
}

function FoodKingBanner({
  mealKcal,
  dailyBmr,
  compact = false,
}: {
  mealKcal: number
  dailyBmr: number
  compact?: boolean
}) {
  const threshold = Math.round(
    dailyBmr * BADGE_THRESHOLDS.foodKingMealBmrRatio,
  )

  if (compact) {
    return (
      <div className="community-foodking-banner community-foodking-banner--compact relative overflow-hidden rounded-xl px-3 py-2">
        <p className="community-foodking-banner__text flex items-center gap-2 text-xs font-semibold">
          <span className="text-base" aria-hidden>
            🥘
          </span>
          美食大王
          <span className="community-foodking-banner__meta ml-auto tabular-nums text-[10px] font-normal">
            {formatMealKcalLine(mealKcal)}
          </span>
        </p>
      </div>
    )
  }

  return (
    <section className="community-foodking-banner relative overflow-hidden rounded-2xl p-4">
      <div className="relative flex items-start gap-3">
        <span
          className="community-foodking-banner__icon-wrap flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl"
          aria-hidden
        >
          🥘
        </span>
        <div className="min-w-0 flex-1">
          <p className="community-foodking-banner__title text-lg font-bold tracking-tight">
            美食大王
          </p>
          <p className="community-foodking-banner__desc mt-0.5 text-sm">
            今日饮食热量达到基础代谢的 1.2 倍，吃货实力认证！
          </p>
          <dl className="mt-3 flex flex-wrap gap-2 text-[11px]">
            <StatChip
              kind="foodKing"
              label={MEAL_KCAL_STAT_LABEL}
              value={`${Math.round(mealKcal)} kcal`}
            />
            <StatChip kind="foodKing" label="达标线" value={`≥${threshold}`} />
            <StatChip kind="foodKing" label="基础代谢" value={`${Math.round(dailyBmr)}`} />
          </dl>
        </div>
      </div>
    </section>
  )
}

function CompactPill({
  kind,
  label,
}: {
  kind: 'champion' | 'elite' | 'meal' | 'foodKing'
  label: string
}) {
  const pillClass = {
    champion: 'community-pill community-pill--champion',
    elite: 'community-pill community-pill--elite',
    foodKing: 'community-pill community-pill--foodKing',
    meal: 'community-pill community-pill--meal',
  } as const

  const emoji =
    kind === 'foodKing' ? '🥘' : heatmapBadgeEmoji(kind)

  return (
    <span className={pillClass[kind]}>
      <span aria-hidden>{emoji}</span>
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
        className={`community-badge-banner community-badge-banner--compact community-badge-banner--${badge} relative overflow-hidden rounded-xl px-3 py-2`}
      >
        <p className="community-badge-banner__text flex items-center gap-2 text-xs font-semibold">
          <span className="text-base" aria-hidden>
            {isChampion ? '👑' : '🔥'}
          </span>
          {isChampion ? '运动大王' : '减脂先锋'}
          <span className="community-badge-banner__meta ml-auto tabular-nums text-[10px] font-normal">
            缺口 +{Math.round(deficit)}
          </span>
        </p>
      </div>
    )
  }

  return (
    <section
      className={`community-badge-banner community-badge-banner--${badge} relative overflow-hidden rounded-2xl p-4`}
    >
      <div className="relative flex items-start gap-3">
        <span
          className={`community-badge-banner__icon-wrap flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl`}
          aria-hidden
        >
          {isChampion ? '👑' : '🔥'}
        </span>
        <div className="min-w-0 flex-1">
          <p className="community-badge-banner__title text-lg font-bold tracking-tight">
            {isChampion ? '运动大王' : '减脂先锋'}
          </p>
          <p className="community-badge-banner__desc mt-0.5 text-sm">
            {isChampion
              ? '高强度训练 + 充足饮食，真正的硬核一天！'
              : '热量缺口拉满，社区里的缺口达人。'}
          </p>
          <dl className="mt-3 flex flex-wrap gap-2 text-[11px]">
            <StatChip kind={badge} label="缺口" value={`+${Math.round(deficit)}`} />
            <StatChip
              kind={badge}
              label={EXERCISE_KCAL_STAT_LABEL}
              value={`${Math.round(exerciseKcal)} kcal`}
            />
            {isChampion && (
              <StatChip
                kind={badge}
                label={MEAL_KCAL_STAT_LABEL}
                value={`${Math.round(mealKcal)} kcal`}
              />
            )}
          </dl>
        </div>
      </div>
    </section>
  )
}

function StatChip({
  kind,
  label,
  value,
}: {
  kind: 'champion' | 'elite' | 'foodKing'
  label: string
  value: string
}) {
  return (
    <span className={`community-badge-chip community-badge-chip--${kind} rounded-lg px-2 py-1`}>
      <span className="community-badge-chip__label">{label} </span>
      <span className="community-badge-chip__value font-semibold tabular-nums">{value}</span>
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
      <div className="community-meal-reminder community-meal-reminder--compact">
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
    <section className="community-meal-reminder rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <span
          className="community-meal-reminder__icon flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl"
          aria-hidden
        >
          🍽️
        </span>
        <div>
          <p className="community-meal-reminder__title font-semibold">记得记饮食</p>
          <p className="community-meal-reminder__desc mt-1 text-sm leading-relaxed">
            今天缺口看起来不错，但饮食还是 0 千卡。
            {isSelf
              ? ' 把吃了什么记下来，缺口才算真实，也方便健友给你点赞～'
              : ' 友善提醒：补录饮食后，数据会更准确哦。'}
          </p>
          {isSelf && (
            <Link
              to="/log/meal"
              className="community-meal-reminder__cta mt-3 inline-block rounded-lg px-3 py-1.5 text-xs font-medium"
            >
              去记饮食
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}

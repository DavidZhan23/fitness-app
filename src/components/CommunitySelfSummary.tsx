import { Link } from 'react-router-dom'
import {
  getTodayMemberCardBadge,
  heatmapBadgeEmoji,
  heatmapBadgeLabel,
  listPublicHonorBadges,
  type PublicHonorBadge,
} from '../lib/communityBadges'
import { saveCommunityUserPreview } from '../lib/communityListCache'
import { computeCommunityDeficit } from '../lib/communityDeficit'
import type { CommunityMember, Profile } from '../types'
import {
  CommunityMemberHonorFx,
  resolveMemberCardFxClass,
} from './CommunityMemberHonorFx'
import { UserAvatar } from './UserAvatar'

const MAX_VISIBLE_HONOR_BADGES = 2

interface CommunitySelfSummaryProps {
  member: CommunityMember | null
  todayKey: string
  viewerProfile?: Profile | null
  selfDayVisible: boolean
  onBeforeNavigate?: () => void
}

function HonorBadgePills({ badges }: { badges: PublicHonorBadge[] }) {
  if (badges.length === 0) return null

  const visible = badges.slice(0, MAX_VISIBLE_HONOR_BADGES)
  const overflow = badges.length - MAX_VISIBLE_HONOR_BADGES

  return (
    <div className="community-self-card__badges community-member-card__honor-pills flex min-w-0 flex-wrap items-center gap-1.5">
      {visible.map((badge) => (
        <span key={badge} className={`community-pill community-pill--${badge}`}>
          <span aria-hidden>{heatmapBadgeEmoji(badge)}</span>
          {heatmapBadgeLabel(badge)}
        </span>
      ))}
      {overflow > 0 && (
        <span className="community-member-card__honor-overflow">+{overflow}</span>
      )}
    </div>
  )
}

function DeficitDisplay({
  isHiddenForViewer,
  deficit,
  surplus,
}: {
  isHiddenForViewer: boolean
  deficit: number
  surplus: boolean
}) {
  if (isHiddenForViewer) {
    return <p className="text-xs text-muted">已隐藏</p>
  }

  return (
    <>
      <p
        className={`text-base font-bold tabular-nums leading-tight ${
          surplus
            ? 'text-red-400'
            : deficit > 0
              ? 'text-emerald-400'
              : 'text-amber-400'
        }`}
      >
        {deficit > 0 ? '+' : ''}
        {Math.round(deficit)}
      </p>
      <p className="text-[9px] text-muted">kcal</p>
    </>
  )
}

export function CommunitySelfSummary({
  member,
  todayKey,
  viewerProfile,
  selfDayVisible,
  onBeforeNavigate,
}: CommunitySelfSummaryProps) {
  if (!member) {
    return (
      <article
        className="community-self-card community-self-card--empty responsive-list-card rounded-2xl"
        aria-label="我的社区"
      >
        <p className="community-self-card__empty-text text-sm text-muted">
          完成今日记录后，你的社区名片会显示在这里
        </p>
      </article>
    )
  }

  const isToday = member.today.date === todayKey
  const isHiddenForViewer = Boolean(member.today.hidden) || !selfDayVisible
  const { exerciseKcal, mealKcal } = member.today
  const todayLikeCount = member.todayLikeCount ?? 0
  const todayDislikeCount = member.todayDislikeCount ?? 0

  const deficit = isHiddenForViewer
    ? 0
    : computeCommunityDeficit(member.today, {
        viewerProfile,
        isSelf: true,
      })
  const surplus = deficit < 0

  const honorBadges = isHiddenForViewer
    ? []
    : listPublicHonorBadges({
        deficit,
        exerciseKcal,
        mealKcal,
        dailyBmr: member.today.dailyBmr,
      })

  const todayBadge = isHiddenForViewer
    ? null
    : getTodayMemberCardBadge(isToday, {
        deficit,
        exerciseKcal,
        mealKcal,
        dailyBmr: member.today.dailyBmr,
      })
  const fxClass = resolveMemberCardFxClass(todayBadge)

  const profilePath = `/community/${member.id}`

  const handleNavigate = () => {
    saveCommunityUserPreview(member)
    onBeforeNavigate?.()
  }

  return (
    <article
      className={`community-self-card responsive-list-card group relative overflow-hidden rounded-2xl ${fxClass}`}
      aria-label="我的社区"
    >
      <CommunityMemberHonorFx badge={todayBadge} />
      <div className="community-card-fx-inner">
        <div className="community-member-card__body">
          <div className="community-self-card__top-row">
          <div className="community-self-card__identity">
            <UserAvatar
              variant="community"
              size="sm"
              nickname={member.nickname}
              avatarUrl={member.avatarUrl}
              isSelf
            />
            <div className="community-self-card__identity-main min-w-0">
              <div className="community-self-card__name-row">
                <span className="community-self-card__name responsive-truncate text-sm font-semibold text-primary">
                  {member.nickname}
                </span>
                <span className="community-self-card__self-badge text-[10px] font-normal accent-exercise">
                  我
                </span>
              </div>
              {!isToday ? (
                <p className="text-[10px] text-muted">{member.today.date}</p>
              ) : null}
            </div>
          </div>
          <Link
            to={profilePath}
            className="community-self-card__profile-link"
            onClick={handleNavigate}
          >
            查看主页
          </Link>
        </div>

        <div className="community-member-card__badge-row">
          {isHiddenForViewer ? (
            <div className="min-w-0 flex-1">
              <p className="text-xs text-secondary">今日未公开</p>
              <p className="mt-0.5 text-[10px] leading-snug text-muted">
                可在今日页记录或调整公开状态
              </p>
            </div>
          ) : (
            honorBadges.length > 0 && <HonorBadgePills badges={honorBadges} />
          )}
          <div className="community-member-card__deficit">
            <DeficitDisplay
              isHiddenForViewer={isHiddenForViewer}
              deficit={deficit}
              surplus={surplus}
            />
          </div>
        </div>

        {!isHiddenForViewer ? (
          <div className="community-member-card__meta-row">
            <p className="community-member-card__stats truncate text-[10px] text-muted">
              运动 {Math.round(exerciseKcal)} kcal
              <span className="mx-1">·</span>
              饮食 {Math.round(mealKcal)} kcal
            </p>
            <div
              className="community-self-card__reactions"
              aria-label="今日互动"
            >
              <span>今日 {todayLikeCount} 赞</span>
              <span aria-hidden>/</span>
              <span>{todayDislikeCount} 踩</span>
            </div>
          </div>
        ) : null}
        </div>
      </div>
    </article>
  )
}

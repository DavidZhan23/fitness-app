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
import { DayLikeButton } from './DayLikeButton'
import { FollowButton } from './FollowButton'
import {
  CommunityMemberHonorFx,
  resolveMemberCardFxClass,
} from './CommunityMemberHonorFx'
import { UserAvatar } from './UserAvatar'
import { ActionRow } from './ui/responsive'

interface CommunityMemberCardProps {
  member: CommunityMember
  todayKey: string
  viewerProfile?: Profile | null
  onFollowChange?: (userId: string, following: boolean) => void
  onLikeChange?: (
    userId: string,
    stats: {
      likeCount: number
      dislikeCount: number
      viewerLiked: boolean
      viewerDisliked: boolean
    },
  ) => void
  isDragging?: boolean
  sortLocked?: boolean
  roundedLeft?: boolean
  onBeforeNavigate?: () => void
}

const MAX_VISIBLE_HONOR_BADGES = 2

function HonorBadgePills({ badges }: { badges: PublicHonorBadge[] }) {
  if (badges.length === 0) return null

  const visible = badges.slice(0, MAX_VISIBLE_HONOR_BADGES)
  const overflow = badges.length - MAX_VISIBLE_HONOR_BADGES

  return (
    <div className="community-member-card__honor-pills flex min-w-0 flex-wrap items-center gap-1.5">
      {visible.map((badge) => (
        <span
          key={badge}
          className={`community-pill community-pill--${badge}`}
        >
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

export function CommunityMemberCard({
  member,
  todayKey,
  viewerProfile,
  onFollowChange,
  onLikeChange,
  isDragging,
  sortLocked,
  roundedLeft = true,
  onBeforeNavigate,
}: CommunityMemberCardProps) {
  const isToday = member.today.date === todayKey
  const isHiddenForViewer = Boolean(member.today.hidden) && !member.isSelf

  const { exerciseKcal, mealKcal } = member.today
  const deficit = isHiddenForViewer
    ? 0
    : computeCommunityDeficit(member.today, {
        viewerProfile,
        isSelf: member.isSelf,
      })
  const surplus = deficit < 0
  const todayBadge = isHiddenForViewer
    ? null
    : getTodayMemberCardBadge(isToday, {
        deficit,
        exerciseKcal,
        mealKcal,
        dailyBmr: member.today.dailyBmr,
      })
  const honorBadges = isHiddenForViewer
    ? []
    : listPublicHonorBadges({
        deficit,
        exerciseKcal,
        mealKcal,
        dailyBmr: member.today.dailyBmr,
      })
  const todayLikeCount = member.todayLikeCount ?? 0
  const todayDislikeCount = member.todayDislikeCount ?? 0
  const viewerLikedToday = member.viewerLikedToday ?? false
  const viewerDislikedToday = member.viewerDislikedToday ?? false

  const roundClass = roundedLeft ? 'rounded-2xl' : 'rounded-r-2xl rounded-l-none'
  const fxClass = resolveMemberCardFxClass(todayBadge)

  const prefetchUserPage = () => {
    void import('../pages/CommunityUserPage')
  }

  return (
    <article
      className={`community-member-card responsive-list-card group relative overflow-hidden ${roundClass} ${fxClass} ${isDragging ? 'opacity-95' : ''}`}
    >
      <CommunityMemberHonorFx badge={todayBadge} />
      <div className="community-card-fx-inner">
        <div className="community-member-card__body">
          <Link
            to={`/community/${member.id}`}
            className={`community-member-card__link block active:scale-[0.99] ${sortLocked ? 'pointer-events-none' : ''}`}
            onMouseEnter={prefetchUserPage}
            onFocus={prefetchUserPage}
            onTouchStart={prefetchUserPage}
            onClick={() => {
              saveCommunityUserPreview(member)
              onBeforeNavigate?.()
            }}
          >
            <ActionRow className="items-center gap-2.5">
              <UserAvatar
                variant="community"
                size="sm"
                nickname={member.nickname}
                avatarUrl={member.avatarUrl}
                isSelf={member.isSelf}
              />
              <div className="responsive-action-row__main">
                <p className="responsive-truncate text-sm font-semibold text-primary">
                  {member.nickname}
                  {member.isSelf && (
                    <span className="ml-1 text-[10px] font-normal accent-exercise">
                      我
                    </span>
                  )}
                </p>
                {!isToday && (
                  <p className="text-[10px] text-muted">{member.today.date}</p>
                )}
              </div>
              {!member.isSelf && (
                <div className="responsive-action-row__end community-member-card__top-actions">
                  <FollowButton
                    userId={member.id}
                    isFollowing={member.isFollowing}
                    compact
                    onChange={(following) => onFollowChange?.(member.id, following)}
                  />
                </div>
              )}
            </ActionRow>

            <div className="community-member-card__badge-row">
              {!isHiddenForViewer && honorBadges.length > 0 && (
                <HonorBadgePills badges={honorBadges} />
              )}
              <div className="community-member-card__deficit">
                <DeficitDisplay
                  isHiddenForViewer={isHiddenForViewer}
                  deficit={deficit}
                  surplus={surplus}
                />
              </div>
            </div>
          </Link>

          {!isHiddenForViewer && (
            <div className="community-member-card__meta-row">
              <p className="community-member-card__stats truncate text-[10px] text-muted">
                运动 {Math.round(exerciseKcal)} kcal
                <span className="mx-1">·</span>
                饮食 {Math.round(mealKcal)} kcal
              </p>
              <div className="community-member-card__meta-actions">
                {member.isSelf ? (
                  <span className="truncate text-[11px] text-muted">
                    {todayLikeCount > 0 || todayDislikeCount > 0
                      ? `今日 ${todayLikeCount} 赞 / ${todayDislikeCount} 踩`
                      : '今日暂无赞踩'}
                  </span>
                ) : (
                  <DayLikeButton
                    userId={member.id}
                    date={todayKey}
                    likeCount={todayLikeCount}
                    dislikeCount={todayDislikeCount}
                    viewerLiked={viewerLikedToday}
                    viewerDisliked={viewerDislikedToday}
                    compact
                    onChange={(stats) => onLikeChange?.(member.id, stats)}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

import { Link } from 'react-router-dom'
import { getTodayMemberCardBadge } from '../lib/communityBadges'
import { saveCommunityUserPreview } from '../lib/communityListCache'
import { formatExerciseKcalLine, formatMealKcalLine } from '../lib/calories'
import { computeCommunityDeficit } from '../lib/communityDeficit'
import type { CommunityMember, Profile } from '../types'
import { CommunityDayStatus } from './CommunityDayStatus'
import { DayLikeButton } from './DayLikeButton'
import { FollowButton } from './FollowButton'
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
  const isChampion = todayBadge === 'champion'
  const isElite = todayBadge === 'elite'
  const todayLikeCount = member.todayLikeCount ?? 0
  const todayDislikeCount = member.todayDislikeCount ?? 0
  const viewerLikedToday = member.viewerLikedToday ?? false
  const viewerDislikedToday = member.viewerDislikedToday ?? false

  const roundClass = roundedLeft ? 'rounded-2xl' : 'rounded-r-2xl rounded-l-none'
  const fxClass = isChampion
    ? 'community-card-champion'
    : isElite
      ? 'community-card-elite'
      : ''

  const prefetchUserPage = () => {
    void import('../pages/CommunityUserPage')
  }

  return (
    <article
      className={`community-member-card responsive-list-card group relative overflow-hidden ${roundClass} ${fxClass} ${isDragging ? 'opacity-95' : ''} ${isChampion || isElite ? '' : ''}`}
    >
      {isElite && (
        <>
          <span className="community-card-elite__ember community-card-elite__ember--l" aria-hidden>
            🔥
          </span>
          <span className="community-card-elite__ember community-card-elite__ember--c" aria-hidden>
            🔥
          </span>
          <span className="community-card-elite__ember community-card-elite__ember--r" aria-hidden>
            🔥
          </span>
        </>
      )}
      {isChampion && (
        <>
          <span className="community-card-champion__aura" aria-hidden />
          <span className="community-card-champion__edge" aria-hidden />
          <span className="community-card-champion__orb community-card-champion__orb--1" aria-hidden />
          <span className="community-card-champion__orb community-card-champion__orb--2" aria-hidden />
          <span
            className="community-card-champion__sparkle community-card-champion__sparkle--tl"
            aria-hidden
          >
            ✦
          </span>
          <span
            className="community-card-champion__sparkle community-card-champion__sparkle--tr"
            aria-hidden
          >
            ✦
          </span>
          <span
            className="community-card-champion__sparkle community-card-champion__sparkle--br"
            aria-hidden
          >
            ✦
          </span>
          <span className="community-card-fx-ribbon community-card-fx-ribbon--champion">
            <span className="community-card-fx-ribbon__glint" aria-hidden />
            👑 运动大王
          </span>
        </>
      )}
      <div className="community-card-fx-inner">
      <Link
        to={`/community/${member.id}`}
        className={`block px-3 pt-3 pb-1.5 active:scale-[0.99] ${sortLocked ? 'pointer-events-none' : ''}`}
        onMouseEnter={prefetchUserPage}
        onFocus={prefetchUserPage}
        onTouchStart={prefetchUserPage}
        onClick={() => {
          saveCommunityUserPreview(member)
          onBeforeNavigate?.()
        }}
      >
        <ActionRow className="items-start gap-2.5">
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
            {isElite && (
              <p className="mt-0.5">
                <span className="community-member-card__onfire community-pill community-pill--elite">
                  <span aria-hidden>🔥</span>
                  ON FIRE
                </span>
              </p>
            )}
            {!isToday && <p className="text-[10px] text-muted">{member.today.date}</p>}
            {(todayLikeCount > 0 || todayDislikeCount > 0) && (
              <p className="text-[10px] text-muted">
                {todayLikeCount > 0 && `已收获 ${todayLikeCount} 赞`}
                {todayLikeCount > 0 && todayDislikeCount > 0 && (
                  <span className="mx-1">·</span>
                )}
                {todayDislikeCount > 0 && `已收获 ${todayDislikeCount} 踩`}
              </p>
            )}
          </div>
          <div className="responsive-action-row__end community-member-card__top-actions">
            {!member.isSelf && (
              <FollowButton
                userId={member.id}
                isFollowing={member.isFollowing}
                compact
                onChange={(following) => onFollowChange?.(member.id, following)}
              />
            )}
            <div className="community-member-card__deficit mt-1.5">
              {isHiddenForViewer ? (
                <p className="text-xs text-muted">已隐藏</p>
              ) : (
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
              )}
            </div>
          </div>
        </ActionRow>

        {isHiddenForViewer ? (
          <p className="community-hidden-panel">今日已隐藏</p>
        ) : (
          <>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-muted">
              <span className="community-stat-pill community-stat-pill--exercise">
                {formatExerciseKcalLine(exerciseKcal)}
              </span>
              <span className="community-stat-pill community-stat-pill--meal">
                {formatMealKcalLine(mealKcal)}
              </span>
            </div>
          </>
        )}
      </Link>

      <div className="community-member-card__footer-row flex min-w-0 flex-nowrap items-end justify-between gap-1.5 px-3 py-2">
        {member.isSelf ? (
          <span className="truncate text-[11px] text-muted">
            {todayLikeCount > 0 || todayDislikeCount > 0
              ? `今日 ${todayLikeCount} 赞 / ${todayDislikeCount} 踩`
              : '今日暂无赞踩'}
          </span>
        ) : (
          <>
            <div className="community-member-card__footer-status min-w-0 flex-1">
              {!isHiddenForViewer && (
                <CommunityDayStatus
                  snapshot={member.today}
                  viewerProfile={viewerProfile}
                  isSelf={member.isSelf}
                  variant="compact"
                />
              )}
            </div>
            <div className="community-member-card__footer-right">
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
            </div>
          </>
        )}
      </div>
      </div>
    </article>
  )
}

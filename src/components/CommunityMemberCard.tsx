import { Link } from 'react-router-dom'
import { getTodayMemberCardBadge } from '../lib/communityBadges'
import { saveCommunityUserPreview } from '../lib/communityListCache'
import { formatExerciseKcalLine, formatMealKcalLine } from '../lib/calories'
import { computeCommunityDeficit } from '../lib/communityDeficit'
import type { CommunityMember, Profile } from '../types'
import { CommunityDayStatus } from './CommunityDayStatus'
import { DayLikeButton } from './DayLikeButton'
import { FollowButton } from './FollowButton'

interface CommunityMemberCardProps {
  member: CommunityMember
  todayKey: string
  viewerProfile?: Profile | null
  onFollowChange?: (userId: string, following: boolean) => void
  onLikeChange?: (
    userId: string,
    stats: { likeCount: number; viewerLiked: boolean },
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
  const initials = member.nickname.slice(0, 1).toUpperCase()
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
      className={`community-member-card group relative overflow-hidden ${roundClass} ${fxClass} ${isDragging ? 'opacity-95' : ''} ${isChampion || isElite ? '' : ''}`}
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
          <span className="community-card-fx-ribbon community-card-fx-ribbon--elite">
            🔥 ON FIRE
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
        <div className="flex items-center gap-2.5">
          <div
            aria-hidden
            className={`community-avatar ${member.isSelf ? 'community-avatar--self' : ''}`}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-primary">
              {member.nickname}
              {member.isSelf && (
                <span className="ml-1 text-[10px] font-normal accent-exercise">
                  我
                </span>
              )}
            </p>
            <p className="text-[10px] text-muted">
              {isToday ? '今日动态' : member.today.date}
            </p>
          </div>
          <div
            className={`shrink-0 text-right ${todayBadge ? 'mt-[calc(0.2cm+2mm)]' : ''}`}
          >
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

      {!isHiddenForViewer && (
        <div className="px-3 pb-0.5">
          <CommunityDayStatus
            snapshot={member.today}
            viewerProfile={viewerProfile}
            isSelf={member.isSelf}
            variant="compact"
          />
        </div>
      )}

      <div className="community-member-card__footer flex min-w-0 flex-nowrap items-center justify-between gap-1.5 px-3 py-2">
        {!member.isSelf ? (
          <DayLikeButton
            userId={member.id}
            date={todayKey}
            likeCount={member.todayLikeCount}
            viewerLiked={member.viewerLikedToday}
            compact
            onChange={(stats) => onLikeChange?.(member.id, stats)}
          />
        ) : (
          <span className="truncate text-[11px] text-muted">
            {member.todayLikeCount > 0
              ? `今日 ${member.todayLikeCount} 赞`
              : '今日暂无点赞'}
          </span>
        )}
        {!member.isSelf && (
          <FollowButton
            userId={member.id}
            isFollowing={member.isFollowing}
            compact
            onChange={(following) => onFollowChange?.(member.id, following)}
          />
        )}
      </div>
      </div>
    </article>
  )
}

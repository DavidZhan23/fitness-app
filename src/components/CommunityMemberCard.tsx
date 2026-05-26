import { Link } from 'react-router-dom'
import { getTodayMemberCardBadge } from '../lib/communityBadges'
import { saveCommunityUserPreview } from '../lib/communityListCache'
import { computeCommunityDeficit } from '../lib/communityDeficit'
import type { CommunityMember, Profile } from '../types'
import { CommunityDayStatus } from './CommunityDayStatus'
import { DayCommunityVisibleToggle } from './DayCommunityVisibleToggle'
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
  onDayVisibleChange?: (visible: boolean) => void
  togglingDayVisible?: boolean
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
  onDayVisibleChange,
  togglingDayVisible = false,
  isDragging,
  sortLocked,
  roundedLeft = true,
  onBeforeNavigate,
}: CommunityMemberCardProps) {
  const isToday = member.today.date === todayKey
  const dayVisible = member.today.dayCommunityVisible !== false
  const isHiddenForViewer = Boolean(member.today.hidden) && !member.isSelf

  const { exerciseKcal, mealKcal, exerciseCount, mealCount } = member.today
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
      className={`group relative overflow-hidden bg-card/80 ring-1 ring-slate-700/50 transition hover:ring-violet-500/40 hover:bg-slate-800/90 ${roundClass} ${fxClass} ${isDragging ? 'opacity-95' : ''} ${isChampion || isElite ? 'hover:ring-inherit' : ''}`}
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
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-bold ${
              member.isSelf
                ? 'bg-violet-500/30 text-violet-200 ring-1 ring-violet-400/50'
                : 'bg-slate-700/80 text-slate-200 ring-1 ring-slate-600'
            }`}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-100">
              {member.nickname}
              {member.isSelf && (
                <span className="ml-1 text-[10px] font-normal text-violet-300">
                  我
                </span>
              )}
            </p>
            <p className="text-[10px] text-muted">
              {isToday ? '今日动态' : member.today.date}
            </p>
          </div>
          {member.isSelf && isToday && onDayVisibleChange ? (
            <DayCommunityVisibleToggle
              visible={dayVisible}
              saving={togglingDayVisible}
              onToggle={() => onDayVisibleChange(!dayVisible)}
            />
          ) : (
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
          )}
        </div>

        {isHiddenForViewer ? (
          <p className="mt-2 rounded-lg border border-dashed border-slate-600/60 bg-slate-900/40 px-2 py-2 text-center text-xs text-muted">
            今日已隐藏
          </p>
        ) : (
          <>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-muted">
              <span className="rounded-md bg-teal-900/30 px-1.5 py-0.5 text-teal-300/90">
                运动 {Math.round(exerciseKcal)}
                {exerciseCount > 0 ? ` · ${exerciseCount}项` : ''}
              </span>
              <span className="rounded-md bg-amber-900/25 px-1.5 py-0.5 text-amber-300/90">
                饮食 {Math.round(mealKcal)}
                {mealCount > 0 ? ` · ${mealCount}项` : ''}
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

      <div className="flex min-w-0 flex-nowrap items-center justify-between gap-1.5 border-t border-slate-700/40 px-3 py-2">
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

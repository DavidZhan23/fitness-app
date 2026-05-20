import { Link } from 'react-router-dom'
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
}: CommunityMemberCardProps) {
  const { exerciseKcal, mealKcal, exerciseCount, mealCount } = member.today
  const deficit = computeCommunityDeficit(member.today, {
    viewerProfile,
    isSelf: member.isSelf,
  })
  const isToday = member.today.date === todayKey
  const surplus = deficit < 0
  const initials = member.nickname.slice(0, 1).toUpperCase()

  const roundClass = roundedLeft ? 'rounded-2xl' : 'rounded-r-2xl rounded-l-none'

  return (
    <article
      className={`group bg-card/80 ring-1 ring-slate-700/50 transition hover:ring-violet-500/40 hover:bg-slate-800/90 ${roundClass} ${isDragging ? 'opacity-95' : ''}`}
    >
      <Link
        to={`/community/${member.id}`}
        className={`block px-3 pt-3 pb-1.5 active:scale-[0.99] ${sortLocked ? 'pointer-events-none' : ''}`}
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
          <div className="shrink-0 text-right">
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
          </div>
        </div>

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
      </Link>

      <div className="px-3 pb-0.5">
        <CommunityDayStatus
          snapshot={member.today}
          viewerProfile={viewerProfile}
          isSelf={member.isSelf}
          variant="compact"
        />
      </div>

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
    </article>
  )
}

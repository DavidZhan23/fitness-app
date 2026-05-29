import { Link } from 'react-router-dom'
import { FollowButton } from './FollowButton'
import { UserAvatar } from './UserAvatar'
import type { CommunityFollower } from '../types'

function formatFollowedAt(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
}

interface CommunityFollowerListProps {
  followers: CommunityFollower[]
  onFollowChange?: (userId: string, following: boolean) => void
}

export function CommunityFollowerList({
  followers,
  onFollowChange,
}: CommunityFollowerListProps) {
  return (
    <ul className="community-follower-list space-y-2">
      {followers.map((follower) => {
        const row = (
          <>
            <UserAvatar
              variant="community"
              size="sm"
              nickname={follower.nickname}
              avatarUrl={follower.avatarUrl}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-primary">
                {follower.nickname}
              </p>
              <p className="text-[10px] text-muted">
                {follower.canViewProfile
                  ? `关注于 ${formatFollowedAt(follower.followedAt)}`
                  : '未公开'}
              </p>
            </div>
            <FollowButton
              userId={follower.id}
              isFollowing={follower.isFollowing}
              compact
              idleLabel="回关"
              onChange={(following) => onFollowChange?.(follower.id, following)}
            />
          </>
        )

        if (!follower.canViewProfile) {
          return (
            <li
              key={follower.id}
              className="community-follower-row flex items-center gap-2.5 rounded-2xl border border-[var(--surface-card-border)] bg-[var(--surface-card)] px-3 py-2.5"
            >
              {row}
            </li>
          )
        }

        return (
          <li key={follower.id}>
            <Link
              to={`/community/${follower.id}`}
              className="community-follower-row flex items-center gap-2.5 rounded-2xl border border-[var(--surface-card-border)] bg-[var(--surface-card)] px-3 py-2.5 transition active:scale-[0.99] hover:opacity-95"
            >
              {row}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

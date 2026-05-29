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
  heading?: string
  subtitle?: string
}

export function CommunityFollowerList({
  followers,
  onFollowChange,
  heading,
  subtitle,
}: CommunityFollowerListProps) {
  return (
    <div className="community-follower-list-wrap">
      {(heading || subtitle) && (
        <div>
          {heading && (
            <p className="community-follower-panel__title">{heading}</p>
          )}
          {subtitle && (
            <p className="community-follower-panel__subtitle">{subtitle}</p>
          )}
        </div>
      )}
      <ul className="community-follower-list">
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
                <p className="truncate text-sm font-medium text-primary">
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
                onChange={(following) =>
                  onFollowChange?.(follower.id, following)
                }
              />
            </>
          )

          if (!follower.canViewProfile) {
            return (
              <li key={follower.id}>
                <div className="community-follower-row">{row}</div>
              </li>
            )
          }

          return (
            <li key={follower.id}>
              <Link to={`/community/${follower.id}`} className="community-follower-row">
                {row}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

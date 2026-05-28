import { displayName } from '../lib/profileDisplay'
import type { AppUser } from '../lib/api'
import type { Profile } from '../types'

function avatarInitial(
  profile: Profile | null | undefined,
  user: AppUser | null | undefined,
  nickname?: string,
): string {
  const nick = nickname?.trim() || profile?.nickname?.trim()
  if (nick) return nick.slice(0, 1)
  const email = profile?.email ?? user?.email ?? ''
  const local = email.split('@')[0]?.trim()
  if (local) {
    const ch = local[0]
    return /[a-z]/i.test(ch) ? ch.toUpperCase() : ch
  }
  return '?'
}

interface UserAvatarProps {
  profile?: Profile | null
  user?: AppUser | null
  nickname?: string
  avatarUrl?: string | null
  isSelf?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'community'
  className?: string
}

const sizeClasses = {
  sm: 'h-10 w-10 text-base',
  md: 'h-11 w-11 text-lg',
  lg: 'h-14 w-14 text-xl',
}

export function UserAvatar({
  profile = null,
  user = null,
  nickname,
  avatarUrl,
  isSelf = false,
  size = 'md',
  variant = 'default',
  className = '',
}: UserAvatarProps) {
  const resolvedUrl = avatarUrl ?? profile?.avatar_url ?? null
  const name = nickname?.trim() || displayName(profile, user)
  const initial = avatarInitial(profile, user, nickname)

  if (variant === 'community') {
    const dim = size === 'lg' ? 'h-12 w-12 text-xl' : sizeClasses[size]
    return (
      <div
        className={`community-avatar flex shrink-0 items-center justify-center overflow-hidden rounded-2xl ${dim} ${
          isSelf ? 'community-avatar--self' : ''
        } ${className}`}
        aria-hidden={!resolvedUrl}
        title={name}
      >
        {resolvedUrl ? (
          <img
            src={resolvedUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          initial
        )}
      </div>
    )
  }

  const dim = sizeClasses[size]
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-brand/80 to-brand-dark font-semibold text-white shadow-inner ring-2 ring-brand/30 ${dim} ${className}`}
      aria-hidden={!resolvedUrl}
      title={name}
    >
      {resolvedUrl ? (
        <img src={resolvedUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        initial
      )}
    </div>
  )
}

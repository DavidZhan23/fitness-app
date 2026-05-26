import { displayName } from '../lib/profileDisplay'
import type { AppUser } from '../lib/api'
import type { Profile } from '../types'

function avatarInitial(profile: Profile | null, user: AppUser | null): string {
  const nick = profile?.nickname?.trim()
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
  profile: Profile | null
  user: AppUser | null
  size?: 'md' | 'lg'
}

export function UserAvatar({ profile, user, size = 'md' }: UserAvatarProps) {
  const dim = size === 'lg' ? 'h-14 w-14 text-xl' : 'h-11 w-11 text-lg'
  const name = displayName(profile, user)

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand/80 to-brand-dark font-semibold text-white shadow-inner ring-2 ring-brand/30 ${dim}`}
      aria-hidden
      title={name}
    >
      {avatarInitial(profile, user)}
    </div>
  )
}

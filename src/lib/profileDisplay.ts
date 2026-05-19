import type { Profile } from '../types'
import type { AppUser } from '../context/AuthContext'

/** 展示用称呼：优先昵称，否则邮箱 @ 前，否则「用户」 */
export function displayName(
  profile: Profile | null | undefined,
  user: AppUser | null | undefined,
): string {
  const nick = profile?.nickname?.trim()
  if (nick) return nick
  const email = profile?.email ?? user?.email
  if (email) {
    const local = email.split('@')[0]?.trim()
    if (local) return local
  }
  return '用户'
}

/** 社区公开昵称 */
export function communityDisplayName(
  nickname: string | null | undefined,
  userId: string,
): string {
  const nick = nickname?.trim()
  if (nick) return nick
  return `健身者${userId.slice(0, 6)}`
}

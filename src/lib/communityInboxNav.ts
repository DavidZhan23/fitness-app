import { normalizeDateKey } from './streaks'
import type { CommunityInboxItem } from '../types'

export function inboxItemHref(item: CommunityInboxItem): string {
  if (item.kind === 'like' || item.kind === 'dislike') {
    return `/community/${item.actorId}`
  }
  if (
    item.kind === 'comment_on_card' ||
    item.kind === 'reply' ||
    item.kind === 'comment_like' ||
    item.kind === 'comment_dislike'
  ) {
    return `/community/${item.targetUserId}?date=${encodeURIComponent(item.logDate)}#day-comments`
  }
  return `/community/${item.targetUserId}?date=${encodeURIComponent(item.logDate)}`
}

export function resolveDateFromSearchParams(
  searchParams: URLSearchParams,
  fallback: string | null,
): string | null {
  const raw = searchParams.get('date')
  if (!raw) return fallback
  const key = normalizeDateKey(raw)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return fallback
  return key
}

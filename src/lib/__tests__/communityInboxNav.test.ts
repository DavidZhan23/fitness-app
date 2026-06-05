import { describe, expect, it } from 'vitest'
import {
  inboxActorDayHref,
  inboxItemHref,
  resolveDateFromSearchParams,
} from '../communityInboxNav'
import type { CommunityInboxItem } from '../../types'

function inboxItem(
  overrides: Partial<CommunityInboxItem> & Pick<CommunityInboxItem, 'kind'>,
): CommunityInboxItem {
  return {
    id: 'test-id',
    actorId: 'actor-1',
    actorNickname: 'Actor',
    logDate: '2025-05-29',
    targetUserId: 'target-1',
    bodyPreview: null,
    createdAt: '2025-05-29T10:00:00.000Z',
    ...overrides,
  }
}

describe('inboxItemHref', () => {
  it('like navigates to target day record without hash', () => {
    expect(inboxItemHref(inboxItem({ kind: 'like' }))).toBe(
      '/community/target-1?date=2025-05-29',
    )
  })

  it('dislike navigates to target day record without hash', () => {
    expect(inboxItemHref(inboxItem({ kind: 'dislike' }))).toBe(
      '/community/target-1?date=2025-05-29',
    )
  })

  it('comment_on_card navigates to card owner with date and comments anchor', () => {
    expect(inboxItemHref(inboxItem({ kind: 'comment_on_card' }))).toBe(
      '/community/target-1?date=2025-05-29#day-comments',
    )
  })

  it('reply navigates to card owner even when actor differs', () => {
    expect(
      inboxItemHref(
        inboxItem({
          kind: 'reply',
          actorId: 'replier-2',
          targetUserId: 'card-owner-3',
          logDate: '2025-04-12',
        }),
      ),
    ).toBe('/community/card-owner-3?date=2025-04-12#day-comments')
  })

  it('comment_like and comment_dislike use card owner date and comments anchor', () => {
    expect(inboxItemHref(inboxItem({ kind: 'comment_like' }))).toBe(
      '/community/target-1?date=2025-05-29#day-comments',
    )
    expect(inboxItemHref(inboxItem({ kind: 'comment_dislike' }))).toBe(
      '/community/target-1?date=2025-05-29#day-comments',
    )
  })
})

describe('inboxActorDayHref', () => {
  it('navigates avatar clicks to actor day record', () => {
    expect(inboxActorDayHref(inboxItem({ kind: 'comment_on_card' }))).toBe(
      '/community/actor-1?date=2025-05-29',
    )
  })
})

describe('resolveDateFromSearchParams', () => {
  it('returns normalized date when valid', () => {
    const params = new URLSearchParams('date=2025-05-29')
    expect(resolveDateFromSearchParams(params, null)).toBe('2025-05-29')
  })

  it('returns fallback when date param missing or invalid', () => {
    expect(resolveDateFromSearchParams(new URLSearchParams(), '2025-05-01')).toBe(
      '2025-05-01',
    )
    expect(
      resolveDateFromSearchParams(new URLSearchParams('date=bad'), '2025-05-01'),
    ).toBe('2025-05-01')
  })
})

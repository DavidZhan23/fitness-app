import { beforeEach, describe, expect, it, vi } from 'vitest'

const queryMock = vi.fn()

vi.mock('../src/db.js', () => ({
  query: (...args) => queryMock(...args),
}))

const {
  getCommunityInboxUnread,
  markCommunityInboxRead,
  loadInboxItems,
  emptyInbox,
} = await import('../src/communityInbox.js')

const VIEWER_ID = 'viewer-1'
const SEEN_AT = new Date('2025-05-01T00:00:00Z')

beforeEach(() => {
  queryMock.mockReset()
})

describe('getCommunityInboxUnread', () => {
  it('returns split counts including follow', async () => {
    const followedAt = new Date('2025-05-20T10:00:00Z')
    queryMock.mockImplementation(async (sql) => {
      if (sql.includes('community_notify_seen_at from profiles')) {
        return { rows: [{ community_notify_seen_at: SEEN_AT }] }
      }
      if (sql.includes('from day_likes') && sql.includes('count')) {
        return { rows: [{ c: 1 }] }
      }
      if (sql.includes('from day_dislikes') && sql.includes('count')) {
        return { rows: [{ c: 0 }] }
      }
      if (
        sql.includes('from day_comments') &&
        sql.includes('reply_to_user_id') &&
        sql.includes('count')
      ) {
        return { rows: [{ c: 1 }] }
      }
      if (
        sql.includes('from day_comments') &&
        sql.includes('target_user_id') &&
        sql.includes('count')
      ) {
        return { rows: [{ c: 1 }] }
      }
      if (sql.includes('from follows') && sql.includes('count')) {
        return { rows: [{ c: 2 }] }
      }
      if (sql.includes('union all') && sql.includes("'follow'")) {
        return {
          rows: [
            {
              kind: 'follow',
              inbox_id: `follow:fan-1:${VIEWER_ID}:${followedAt.toISOString()}`,
              created_at: followedAt,
              log_date: '2025-05-20',
              target_user_id: VIEWER_ID,
              actor_id: 'fan-1',
              body_preview: null,
              actor_nickname: 'Fan',
              viewer_follows_actor: false,
              actor_can_view_profile: true,
            },
          ],
        }
      }
      return { rows: [] }
    })

    const data = await getCommunityInboxUnread(VIEWER_ID)

    expect(data.interactionCount).toBe(3)
    expect(data.followersOnMe).toBe(2)
    expect(data.count).toBe(5)
    expect(data.items[0]).toMatchObject({
      kind: 'follow',
      id: expect.stringMatching(/^follow:fan-1:/),
      actorId: 'fan-1',
      actorNickname: 'Fan',
      createdAt: followedAt,
      viewerFollowsActor: false,
      actorCanViewProfile: true,
    })
  })

  it('returns empty inbox on first visit', async () => {
    queryMock.mockImplementation(async (sql) => {
      if (sql.includes('community_notify_seen_at')) {
        return { rows: [{ community_notify_seen_at: null }] }
      }
      if (sql.includes('update profiles set community_notify_seen_at')) {
        return { rows: [] }
      }
      return { rows: [] }
    })

    const data = await getCommunityInboxUnread(VIEWER_ID)
    expect(data).toEqual(emptyInbox())
  })
})

describe('markCommunityInboxRead', () => {
  it('clears unread counts after seenAt advances', async () => {
    let seenAt = SEEN_AT
    queryMock.mockImplementation(async (sql, params) => {
      if (sql.includes('update profiles set community_notify_seen_at = now()')) {
        seenAt = new Date('2025-05-21T00:00:00Z')
        return { rows: [] }
      }
      if (sql.includes('community_notify_seen_at from profiles')) {
        return { rows: [{ community_notify_seen_at: seenAt }] }
      }
      if (sql.includes('count')) {
        return { rows: [{ c: 0 }] }
      }
      if (sql.includes('union all')) {
        return { rows: [] }
      }
      return { rows: [] }
    })

    await markCommunityInboxRead(VIEWER_ID)
    const data = await getCommunityInboxUnread(VIEWER_ID)

    expect(data.count).toBe(0)
    expect(data.followersOnMe).toBe(0)
    expect(data.interactionCount).toBe(0)
  })
})

describe('loadInboxItems', () => {
  it('maps follow rows with stable id and required fields', async () => {
    const followedAt = new Date('2025-05-20T12:00:00Z')
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          kind: 'follow',
          inbox_id: `follow:actor-9:${VIEWER_ID}:${followedAt.toISOString()}`,
          created_at: followedAt,
          log_date: '2025-05-20',
          target_user_id: VIEWER_ID,
          actor_id: 'actor-9',
          body_preview: null,
          actor_nickname: 'Actor',
          viewer_follows_actor: true,
          actor_can_view_profile: false,
        },
      ],
    })

    const items = await loadInboxItems(VIEWER_ID, { limit: 10, offset: 0 })

    expect(items).toHaveLength(1)
    expect(items[0]).toEqual({
      id: `follow:actor-9:${VIEWER_ID}:${followedAt.toISOString()}`,
      kind: 'follow',
      actorId: 'actor-9',
      actorNickname: 'Actor',
      logDate: '2025-05-20',
      targetUserId: VIEWER_ID,
      bodyPreview: null,
      createdAt: followedAt,
      viewerFollowsActor: true,
      actorCanViewProfile: false,
    })
  })
})

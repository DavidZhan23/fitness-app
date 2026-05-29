import { beforeEach, describe, expect, it, vi } from 'vitest'

const queryMock = vi.fn()

vi.mock('../src/db.js', () => ({
  query: (...args) => queryMock(...args),
}))

const { listCommunityFollowers } = await import('../src/social.js')

const VIEWER_ID = 'viewer-1'

beforeEach(() => {
  queryMock.mockReset()
})

describe('listCommunityFollowers', () => {
  it('returns followers with follow-back and profile visibility flags', async () => {
    const followedAt = new Date('2025-05-20T08:00:00Z')
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          follower_id: 'fan-1',
          created_at: followedAt,
          nickname: 'Fan',
          avatar_url: null,
          community_visible: true,
          onboarding_complete: true,
          viewer_follows_back: false,
        },
        {
          follower_id: 'fan-2',
          created_at: followedAt,
          nickname: null,
          avatar_url: 'https://x/a.png',
          community_visible: false,
          onboarding_complete: true,
          viewer_follows_back: true,
        },
      ],
    })

    const data = await listCommunityFollowers(VIEWER_ID)

    expect(data.total).toBe(2)
    expect(data.followers[0]).toMatchObject({
      id: 'fan-1',
      nickname: 'Fan',
      isFollowing: false,
      canViewProfile: true,
    })
    expect(data.followers[1]).toMatchObject({
      id: 'fan-2',
      isFollowing: true,
      canViewProfile: false,
      avatarUrl: 'https://x/a.png',
    })
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('where f.followee_id = $1'),
      [VIEWER_ID],
    )
  })

  it('returns empty list when nobody follows the viewer', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] })
    const data = await listCommunityFollowers(VIEWER_ID)
    expect(data).toEqual({ total: 0, followers: [] })
  })
})

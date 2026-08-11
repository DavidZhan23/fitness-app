import { beforeEach, describe, expect, it, vi } from 'vitest'

const queryMock = vi.fn()

vi.mock('../src/db.js', () => ({
  query: (...args) => queryMock(...args),
}))

vi.mock('../src/community.js', () => ({
  loadProfile: vi.fn(async (userId) =>
    userId === 'missing' ? null : { id: userId, nickname: 'Test' },
  ),
}))

vi.mock('../src/publicProfile.js', () => ({
  publicNickname: (profile) => profile.nickname || '用户',
}))

const {
  listDeveloperCommunityMembers,
  setDeveloperCommunityVisibility,
} = await import('../src/developerCommunity.js')

describe('developerCommunity', () => {
  beforeEach(() => {
    queryMock.mockReset()
  })

  it('lists members with visibility flags', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          id: 'u1',
          nickname: 'Amy',
          community_visible: true,
          community_visible_locked_by_developer: false,
          onboarding_complete: true,
          created_at: '2026-01-01T00:00:00.000Z',
          email: 'amy@example.com',
        },
      ],
    })

    const members = await listDeveloperCommunityMembers()
    expect(members).toEqual([
      {
        id: 'u1',
        email: 'amy@example.com',
        nickname: 'Amy',
        communityVisible: true,
        communityVisibleLockedByDeveloper: false,
        onboardingComplete: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ])
  })

  it('hides and locks community visibility', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] })

    const result = await setDeveloperCommunityVisibility('u1', false)
    expect(result).toEqual({
      id: 'u1',
      communityVisible: false,
      communityVisibleLockedByDeveloper: true,
    })
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('community_visible = $1'),
      [false, true, 'u1'],
    )
  })

  it('shows and unlocks community visibility again', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] })

    const result = await setDeveloperCommunityVisibility('u1', true)

    expect(result).toEqual({
      id: 'u1',
      communityVisible: true,
      communityVisibleLockedByDeveloper: false,
    })
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('community_visible_locked_by_developer = $2'),
      [true, false, 'u1'],
    )
  })

  it('throws 404 when user missing', async () => {
    await expect(
      setDeveloperCommunityVisibility('missing', false),
    ).rejects.toMatchObject({ status: 404 })
  })
})

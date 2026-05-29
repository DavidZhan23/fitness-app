import { beforeEach, describe, expect, it, vi } from 'vitest'

const queryMock = vi.fn()

vi.mock('../src/db.js', () => ({
  query: (...args) => queryMock(...args),
}))

vi.mock('../src/communityVisibility.js', () => ({
  syncCommunityVisibility: vi.fn().mockResolvedValue({
    community_visible: true,
    changed: false,
  }),
  applyYesterdayVisibilityRules: vi.fn(async (profiles, _viewerId, today) =>
    profiles.map((profile) => ({
      ...profile,
      todaySnap: {
        date: today,
        deficit: 0,
        exerciseKcal: 0,
        mealKcal: 0,
        exerciseCount: 0,
        mealCount: 0,
        dailyBmr: 1500,
        threshold: 500,
        accountStartKey: null,
      },
    })),
  ),
}))

const { listCommunityMembers } = await import('../src/community.js')

const VIEWER_ID = 'viewer-1'

function profile(id, nickname, overrides = {}) {
  return {
    id,
    nickname,
    community_visible: true,
    onboarding_complete: true,
    avatar_url: null,
    wall_style: 'classic',
    deficit_threshold: 500,
    created_at: new Date('2024-01-01'),
    ...overrides,
  }
}

function viewerProfile() {
  return profile(VIEWER_ID, 'Viewer', { isSelf: true })
}

function emptySnap(today) {
  return {
    date: today,
    deficit: 0,
    exerciseKcal: 0,
    mealKcal: 0,
    exerciseCount: 0,
    mealCount: 0,
    dailyBmr: 1500,
    threshold: 500,
    accountStartKey: null,
  }
}

beforeEach(() => {
  queryMock.mockReset()
})

describe('listCommunityMembers', () => {
  it('returns public onboarding user without recent logs in all filter', async () => {
    const noLogUser = profile('no-log-user', '无记录')

    queryMock.mockImplementation(async (sql) => {
      if (sql.includes('where id = $1')) {
        return { rows: [viewerProfile()] }
      }
      if (sql.includes('community_member_order')) {
        return { rows: [] }
      }
      if (sql.includes('community_visible = true')) {
        expect(sql).not.toMatch(/limit\s+80/i)
        expect(sql).not.toMatch(/updated_at/i)
        return { rows: [viewerProfile(), noLogUser] }
      }
      return { rows: [] }
    })

    const { members } = await listCommunityMembers(VIEWER_ID, '2026-05-29', 'all')

    expect(members.some((m) => m.id === 'no-log-user')).toBe(true)
    expect(members.find((m) => m.id === 'no-log-user')?.today).toEqual(
      emptySnap('2026-05-29'),
    )
  })

  it('does not truncate more than 80 public users', async () => {
    const others = Array.from({ length: 81 }, (_, i) =>
      profile(`user-${String(i).padStart(3, '0')}`, `用户${i}`),
    )

    queryMock.mockImplementation(async (sql) => {
      if (sql.includes('where id = $1')) {
        return { rows: [viewerProfile()] }
      }
      if (sql.includes('community_member_order')) {
        return { rows: [] }
      }
      if (sql.includes('community_visible = true')) {
        return { rows: [viewerProfile(), ...others] }
      }
      return { rows: [] }
    })

    const { members } = await listCommunityMembers(VIEWER_ID, '2026-05-29', 'all')

    expect(members).toHaveLength(82)
  })

  it('excludes community_visible=false profiles from SQL candidate set', async () => {
    queryMock.mockImplementation(async (sql) => {
      if (sql.includes('where id = $1')) {
        return { rows: [viewerProfile()] }
      }
      if (sql.includes('community_member_order')) {
        return { rows: [] }
      }
      if (sql.includes('community_visible = true')) {
        return {
          rows: [
            viewerProfile(),
            profile('visible-user', '公开用户'),
          ],
        }
      }
      return { rows: [] }
    })

    const { members } = await listCommunityMembers(VIEWER_ID, '2026-05-29', 'all')

    expect(members.some((m) => m.id === 'hidden-user')).toBe(false)
    expect(members.some((m) => m.id === 'visible-user')).toBe(true)
  })

  it('sorts with self first then zh-CN nickname', async () => {
    queryMock.mockImplementation(async (sql) => {
      if (sql.includes('where id = $1')) {
        return { rows: [viewerProfile()] }
      }
      if (sql.includes('community_member_order')) {
        return { rows: [] }
      }
      if (sql.includes('community_visible = true')) {
        return {
          rows: [
            viewerProfile(),
            profile('2', '王五'),
            profile('1', '张三'),
            profile('3', '李四'),
          ],
        }
      }
      return { rows: [] }
    })

    const { members } = await listCommunityMembers(VIEWER_ID, '2026-05-29', 'all')

    const others = members.filter((m) => !m.isSelf)
    const expected = [...others].sort((a, b) => {
      const nameCmp = a.nickname.localeCompare(b.nickname, 'zh-CN')
      return nameCmp !== 0 ? nameCmp : a.id.localeCompare(b.id)
    })

    expect(members[0].isSelf).toBe(true)
    expect(others.map((m) => m.nickname)).toEqual(
      expected.map((m) => m.nickname),
    )
  })
})

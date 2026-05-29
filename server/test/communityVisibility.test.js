import { beforeEach, describe, expect, it, vi } from 'vitest'

const queryMock = vi.fn()
const computeDaySnapshotMock = vi.fn()
const loadProfileMock = vi.fn()

vi.mock('../src/db.js', () => ({
  query: (...args) => queryMock(...args),
}))

vi.mock('../src/community.js', () => ({
  computeDaySnapshot: (...args) => computeDaySnapshotMock(...args),
  loadProfile: (...args) => loadProfileMock(...args),
}))

const { applyYesterdayVisibilityRules, syncCommunityVisibility } = await import(
  '../src/communityVisibility.js'
)

const emptySnap = (today) => ({
  date: today,
  deficit: 0,
  exerciseKcal: 0,
  mealKcal: 0,
  exerciseCount: 0,
  mealCount: 0,
  dailyBmr: 1500,
  threshold: 500,
  accountStartKey: null,
})

beforeEach(() => {
  queryMock.mockReset()
  computeDaySnapshotMock.mockReset()
  loadProfileMock.mockReset()
  computeDaySnapshotMock.mockImplementation(async (_profile, today) =>
    emptySnap(today),
  )
})

describe('applyYesterdayVisibilityRules', () => {
  it('includes public onboarding users without recent logs', async () => {
    const profiles = [
      {
        id: 'user-no-log',
        nickname: '无记录用户',
        community_visible: true,
        onboarding_complete: true,
      },
    ]

    const result = await applyYesterdayVisibilityRules(
      profiles,
      'viewer',
      '2026-05-29',
    )

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('user-no-log')
    expect(result[0].todaySnap.exerciseKcal).toBe(0)
    expect(queryMock).not.toHaveBeenCalled()
  })
})

describe('syncCommunityVisibility', () => {
  it('does not auto-hide when there is no recent log', async () => {
    loadProfileMock.mockResolvedValue({
      id: 'user-1',
      community_visible: true,
    })

    const result = await syncCommunityVisibility('user-1', '2026-05-29')

    expect(result).toEqual({ community_visible: true, changed: false })
    expect(queryMock).not.toHaveBeenCalled()
  })

  it('auto-shows when there is a recent log and profile was hidden', async () => {
    loadProfileMock.mockResolvedValue({
      id: 'user-1',
      community_visible: false,
    })
    computeDaySnapshotMock.mockImplementation(async (_profile, today) => ({
      ...emptySnap(today),
      exerciseCount: 1,
    }))
    queryMock.mockResolvedValue({ rows: [] })

    const result = await syncCommunityVisibility('user-1', '2026-05-29')

    expect(result).toEqual({ community_visible: true, changed: true })
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('community_visible = true'),
      ['user-1'],
    )
  })
})

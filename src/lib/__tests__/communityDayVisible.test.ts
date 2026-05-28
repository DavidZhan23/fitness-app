import { describe, expect, it } from 'vitest'
import {
  patchSelfDayCommunityVisible,
  resolveSelfDayVisible,
} from '../communityListCache'
import type { CommunityMember } from '../../types'

function selfMember(dayCommunityVisible?: boolean): CommunityMember {
  return {
    id: 'self',
    nickname: '我',
    isSelf: true,
    isFollowing: false,
    todayLikeCount: 0,
    todayDislikeCount: 0,
    viewerLikedToday: false,
    viewerDislikedToday: false,
    today: {
      date: '2026-05-26',
      deficit: 0,
      exerciseKcal: 0,
      mealKcal: 0,
      exerciseCount: 0,
      mealCount: 0,
      dailyBmr: 1500,
      threshold: 500,
      accountStartKey: null,
      dayCommunityVisible,
    },
  }
}

describe('resolveSelfDayVisible', () => {
  it('defaults to visible when self card missing', () => {
    expect(resolveSelfDayVisible([])).toBe(true)
  })

  it('reads hidden state without requiring date match', () => {
    const member = selfMember(false)
    member.today.date = '2026-05-25'
    expect(resolveSelfDayVisible([member])).toBe(false)
  })

  it('patches self member day visibility', () => {
    const next = patchSelfDayCommunityVisible([selfMember(true)], false)
    expect(next[0]?.today.dayCommunityVisible).toBe(false)
    expect(next[0]?.today.hidden).toBe(false)
  })
})

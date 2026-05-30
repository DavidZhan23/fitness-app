import { describe, expect, it } from 'vitest'
import {
  BANNED_DEFICIT_GOAL_PHRASES,
  formatDeficitGoalStatus,
  parseDeficitGoalInput,
} from '../deficitGoal'

function expectNoBannedPhrases(message: string) {
  for (const phrase of BANNED_DEFICIT_GOAL_PHRASES) {
    expect(message).not.toContain(phrase)
  }
}

describe('formatDeficitGoalStatus', () => {
  it('surplus when deficit < 0 with goal threshold', () => {
    const status = formatDeficitGoalStatus(-100, 500)
    expect(status).toEqual({
      kind: 'surplus',
      message: '当前为热量盈余 · 目标缺口 500 kcal',
      unitLabel: 'kcal 盈余',
    })
    expectNoBannedPhrases(status.message)
  })

  it('surplus when deficit < 0 without goal threshold', () => {
    const status = formatDeficitGoalStatus(-50, 0)
    expect(status).toEqual({
      kind: 'surplus',
      message: '当前为热量盈余',
      unitLabel: 'kcal 盈余',
    })
    expectNoBannedPhrases(status.message)
  })

  it('noGoal when threshold <= 0 and deficit >= 0', () => {
    const status = formatDeficitGoalStatus(200, 0)
    expect(status).toEqual({
      kind: 'noGoal',
      message: '当前为热量缺口',
      unitLabel: 'kcal 缺口',
    })
    expectNoBannedPhrases(status.message)
  })

  it('met when deficit > threshold', () => {
    const status = formatDeficitGoalStatus(929, 500)
    expect(status).toEqual({
      kind: 'met',
      message: '目标缺口 500 kcal · 已达成',
      unitLabel: 'kcal 缺口',
    })
    expectNoBannedPhrases(status.message)
  })

  it('short when below threshold', () => {
    const status = formatDeficitGoalStatus(320, 500)
    expect(status).toEqual({
      kind: 'short',
      message: '目标缺口 500 kcal · 还差 180 kcal',
      unitLabel: 'kcal 缺口',
    })
    expectNoBannedPhrases(status.message)
  })

  it('short with zero remaining when equal to threshold', () => {
    const status = formatDeficitGoalStatus(500, 500)
    expect(status).toEqual({
      kind: 'short',
      message: '目标缺口 500 kcal · 还差 0 kcal',
      unitLabel: 'kcal 缺口',
    })
    expectNoBannedPhrases(status.message)
  })
})

describe('parseDeficitGoalInput', () => {
  it('accepts 1..5000', () => {
    expect(parseDeficitGoalInput('300')).toBe(300)
    expect(parseDeficitGoalInput('5000')).toBe(5000)
  })

  it('rejects out of range', () => {
    expect(parseDeficitGoalInput('0')).toBeNull()
    expect(parseDeficitGoalInput('5001')).toBeNull()
    expect(parseDeficitGoalInput('')).toBeNull()
  })
})

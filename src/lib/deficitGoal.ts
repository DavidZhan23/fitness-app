import { toKcal } from './calories'

export const DEFICIT_GOAL_PRESETS = [
  { kcal: 300, label: '轻盈一点' },
  { kcal: 500, label: '标准减脂' },
  { kcal: 800, label: '冲刺模式' },
] as const

export const DEFICIT_GOAL_MIN = 1
export const DEFICIT_GOAL_MAX = 5000

/** 禁止出现在 UI 中的旧句式（单测校验） */
export const BANNED_DEFICIT_GOAL_PHRASES = [
  '已超过目标缺口',
  '距目标缺口还差',
] as const

export type DeficitGoalStatusKind = 'surplus' | 'noGoal' | 'met' | 'short'

export interface DeficitGoalStatus {
  kind: DeficitGoalStatusKind
  message: string
  unitLabel: 'kcal 缺口' | 'kcal 盈余'
}

export function formatDeficitGoalStatus(
  deficit: number,
  threshold: number,
): DeficitGoalStatus {
  const d = Math.round(toKcal(deficit))
  const t = Math.round(toKcal(threshold))

  if (d < 0) {
    return {
      kind: 'surplus',
      message:
        t > 0
          ? `当前为热量盈余 · 目标缺口 ${t} kcal`
          : '当前为热量盈余',
      unitLabel: 'kcal 盈余',
    }
  }
  if (t <= 0) {
    return {
      kind: 'noGoal',
      message: '当前为热量缺口',
      unitLabel: 'kcal 缺口',
    }
  }
  if (d > t) {
    return {
      kind: 'met',
      message: `目标缺口 ${t} kcal · 已达成`,
      unitLabel: 'kcal 缺口',
    }
  }
  const remaining = Math.max(0, t - d)
  return {
    kind: 'short',
    message: `目标缺口 ${t} kcal · 还差 ${remaining} kcal`,
    unitLabel: 'kcal 缺口',
  }
}

export function parseDeficitGoalInput(value: string): number | null {
  const n = parseInt(value.trim(), 10)
  if (!Number.isFinite(n) || n < DEFICIT_GOAL_MIN || n > DEFICIT_GOAL_MAX) {
    return null
  }
  return n
}

export function deficitGoalValueTone(
  deficit: number,
  threshold: number,
): 'surplus' | 'positive' | 'neutral' {
  const d = Math.round(toKcal(deficit))
  const t = Math.round(toKcal(threshold))
  if (d < 0) return 'surplus'
  if (t > 0 && d > t) return 'positive'
  return 'neutral'
}

/** 社区当日状态阈值（kcal） */
export const BADGE_THRESHOLDS = {
  mealReminderDeficit: 500,
  eliteDeficit: 500,
  championDeficit: 800,
  championExercise: 600,
  championMeal: 1000,
} as const

export type CommunityDayBadge = 'champion' | 'elite'

export interface CommunityDayStatus {
  needsMealLog: boolean
  badge: CommunityDayBadge | null
}

export function evaluateCommunityDayStatus(input: {
  deficit: number
  exerciseKcal: number
  mealKcal: number
}): CommunityDayStatus {
  const deficit = Math.round(input.deficit)
  const exerciseKcal = Math.round(input.exerciseKcal)
  const mealKcal = Math.round(input.mealKcal)
  const {
    mealReminderDeficit,
    eliteDeficit,
    championDeficit,
    championExercise,
    championMeal,
  } = BADGE_THRESHOLDS

  const needsMealLog = deficit > mealReminderDeficit && mealKcal <= 0

  const isChampion =
    deficit > championDeficit &&
    exerciseKcal > championExercise &&
    mealKcal >= championMeal

  let badge: CommunityDayBadge | null = null
  if (isChampion) {
    badge = 'champion'
  } else if (deficit > eliteDeficit && !needsMealLog) {
    badge = 'elite'
  }

  return { needsMealLog, badge }
}

/** 打卡墙格子上显示的成就类型 */
export type HeatmapDayBadge = 'champion' | 'elite' | 'meal'

export function resolveHeatmapDayBadge(input: {
  deficit: number
  exerciseKcal: number
  mealKcal: number
}): HeatmapDayBadge | null {
  const { needsMealLog, badge } = evaluateCommunityDayStatus(input)
  if (badge === 'champion') return 'champion'
  if (badge === 'elite') return 'elite'
  if (needsMealLog) return 'meal'
  return null
}

export function heatmapBadgeLabel(badge: HeatmapDayBadge): string {
  switch (badge) {
    case 'champion':
      return '运动大王'
    case 'elite':
      return '缺口先锋'
    case 'meal':
      return '记得记饮食'
  }
}

export function heatmapBadgeEmoji(badge: HeatmapDayBadge): string {
  switch (badge) {
    case 'champion':
      return '👑'
    case 'elite':
      return '🔥'
    case 'meal':
      return '🍽️'
  }
}

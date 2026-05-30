/** 社区当日状态阈值（kcal） */
export const BADGE_THRESHOLDS = {
  mealReminderDeficit: 500,
  eliteDeficit: 500,
  championDeficit: 800,
  championExercise: 600,
  championMeal: 1000,
  /** 饮食 kcal ≥ 基础代谢 × 此比例 → 美食大王 */
  foodKingMealBmrRatio: 1.2,
} as const

export type CommunityDayBadge = 'champion' | 'elite'

export interface CommunityDayStatus {
  needsMealLog: boolean
  badge: CommunityDayBadge | null
  foodKing: boolean
}

export function isFoodKing(mealKcal: number, dailyBmr: number): boolean {
  const bmr = Math.round(dailyBmr)
  if (bmr <= 0) return false
  const threshold = Math.round(bmr * BADGE_THRESHOLDS.foodKingMealBmrRatio)
  return Math.round(mealKcal) >= threshold
}

export function evaluateCommunityDayStatus(input: {
  deficit: number
  exerciseKcal: number
  mealKcal: number
  dailyBmr: number
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

  if (mealKcal <= 0) {
    return { needsMealLog, badge: null, foodKing: false }
  }

  const foodKing = isFoodKing(mealKcal, input.dailyBmr)

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

  return { needsMealLog, badge, foodKing }
}

/** 社区列表名片特效：仅当日，运动大王优先于减脂先锋（美食大王无特效） */
export function getTodayMemberCardBadge(
  isToday: boolean,
  input: {
    deficit: number
    exerciseKcal: number
    mealKcal: number
    dailyBmr: number
  },
): CommunityDayBadge | null {
  if (!isToday) return null
  return evaluateCommunityDayStatus(input).badge
}

/** 打卡墙格子上显示的成就类型（仅展示一个，优先级：运动大王 > 减脂先锋 > 美食大王 > 记饮食） */
export type HeatmapDayBadge = 'champion' | 'elite' | 'foodKing' | 'meal'

export function resolveHeatmapDayBadge(input: {
  deficit: number
  exerciseKcal: number
  mealKcal: number
  dailyBmr: number
}): HeatmapDayBadge | null {
  const { needsMealLog, badge, foodKing } = evaluateCommunityDayStatus(input)
  if (badge === 'champion') return 'champion'
  if (badge === 'elite') return 'elite'
  if (foodKing) return 'foodKing'
  if (needsMealLog) return 'meal'
  return null
}

export type ExerciseGridDayBadge = 'champion' | 'elite'
export type DeficitGridDayBadge = 'foodKing' | 'meal'

/** Popover：当天所有达成称号（顺序固定） */
export function listDayBadges(input: {
  deficit: number
  exerciseKcal: number
  mealKcal: number
  dailyBmr: number
}): HeatmapDayBadge[] {
  const { needsMealLog, badge, foodKing } = evaluateCommunityDayStatus(input)
  const out: HeatmapDayBadge[] = []
  if (badge === 'champion') out.push('champion')
  else if (badge === 'elite') out.push('elite')
  if (foodKing) out.push('foodKing')
  if (needsMealLog) out.push('meal')
  return out
}

export type PublicHonorBadge = 'champion' | 'elite' | 'foodKing'

/** 社区公开列表：仅荣誉称号，不含 meal 提醒 */
export function listPublicHonorBadges(input: {
  deficit: number
  exerciseKcal: number
  mealKcal: number
  dailyBmr: number
}): PublicHonorBadge[] {
  const { badge, foodKing } = evaluateCommunityDayStatus(input)
  const out: PublicHonorBadge[] = []
  if (badge === 'champion') out.push('champion')
  else if (badge === 'elite') out.push('elite')
  if (foodKing) out.push('foodKing')
  return out
}

/** 运动墙格子角标（互斥：champion > elite） */
export function resolveExerciseGridBadge(input: {
  deficit: number
  exerciseKcal: number
  mealKcal: number
  dailyBmr: number
}): ExerciseGridDayBadge | null {
  const { badge } = evaluateCommunityDayStatus(input)
  return badge
}

/** 代谢墙格子角标（互斥：foodKing > meal） */
export function resolveDeficitGridBadge(input: {
  deficit: number
  exerciseKcal: number
  mealKcal: number
  dailyBmr: number
}): DeficitGridDayBadge | null {
  const { needsMealLog, foodKing } = evaluateCommunityDayStatus(input)
  if (foodKing) return 'foodKing'
  if (needsMealLog) return 'meal'
  return null
}

export function heatmapBadgeLabel(badge: HeatmapDayBadge): string {
  switch (badge) {
    case 'champion':
      return '运动大王'
    case 'elite':
      return '减脂先锋'
    case 'foodKing':
      return '美食大王'
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
    case 'foodKing':
      return '🥘'
    case 'meal':
      return '🍽️'
  }
}


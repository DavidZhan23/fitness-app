/** 社区当日状态阈值（kcal）。保持与 src/lib/communityBadges.ts 同步。 */
export const BADGE_THRESHOLDS = {
  mealReminderDeficit: 500,
  eliteDeficit: 500,
  championDeficit: 800,
  championExercise: 600,
  championMeal: 1000,
  foodKingMealBmrRatio: 1.2,
}

export function isFoodKing(mealKcal, dailyBmr) {
  const bmr = Math.round(Number(dailyBmr) || 0)
  if (bmr <= 0) return false
  const threshold = Math.round(bmr * BADGE_THRESHOLDS.foodKingMealBmrRatio)
  return Math.round(Number(mealKcal) || 0) >= threshold
}

export function evaluateCommunityDayStatus(input) {
  const deficit = Math.round(Number(input.deficit) || 0)
  const exerciseKcal = Math.round(Number(input.exerciseKcal) || 0)
  const mealKcal = Math.round(Number(input.mealKcal) || 0)
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

  let badge = null
  if (isChampion) {
    badge = 'champion'
  } else if (deficit > eliteDeficit && !needsMealLog) {
    badge = 'elite'
  }

  return { needsMealLog, badge, foodKing }
}

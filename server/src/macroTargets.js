/**
 * 前后端共用的宏量目标规则。
 * 调用方负责用各端已有公式解决 TDEE，这里只做宏量分配。
 */

function finiteNonNegative(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

/**
 * @param {{
 *   sex?: string|null,
 *   weightKg?: number|null,
 *   activityFactor?: number|null,
 *   tdee?: number|null,
 *   deficitThreshold?: number|null,
 * }} input
 * @param {'high-oil-sugar'|'normal'|'low-oil-sugar'} [tier]
 */
export function calculateMacroTargetsFromMetabolism(input = {}, tier = 'normal') {
  const sex = input.sex === 'female' ? 'female' : 'male'
  const fallbackWeight = sex === 'female' ? 60 : 70
  const weight = finiteNonNegative(input.weightKg) || fallbackWeight
  const activity = finiteNonNegative(input.activityFactor) || 1.2
  const fallbackCalories = sex === 'female' ? 1800 : 2200
  const tdee = finiteNonNegative(input.tdee) || fallbackCalories
  const deficitGoal = Math.min(
    750,
    finiteNonNegative(input.deficitThreshold) ?? 0,
  )
  const calorieFloor = sex === 'female' ? 1200 : 1500
  const targetCalories = Math.max(calorieFloor, tdee - deficitGoal)

  let proteinPerKg =
    activity <= 1.2 ? 1.2 : activity <= 1.375 ? 1.4 : activity <= 1.55 ? 1.6 : 1.8
  if (deficitGoal >= 300) proteinPerKg = Math.min(2, proteinPerKg + 0.2)
  const protein = weight * proteinPerKg
  const normalFatPerKg = sex === 'female' || activity >= 1.55 ? 0.9 : 0.8
  const fat =
    tier === 'low-oil-sugar'
      ? 30
      : weight * (tier === 'high-oil-sugar' ? 1.1 : normalFatPerKg)
  const remainingCalories = Math.max(0, targetCalories - protein * 4 - fat * 9)
  const carbs = Math.max(0, remainingCalories / 4)
  const sugar =
    tier === 'high-oil-sugar' ? 50 : tier === 'low-oil-sugar' ? 15 : 25

  return {
    protein_g: Math.round(protein),
    fat_g: Math.round(fat),
    carbs_g: Math.round(carbs),
    sugar_g: Math.round(sugar),
  }
}

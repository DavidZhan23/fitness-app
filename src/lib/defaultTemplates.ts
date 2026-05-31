const seededUserIds = new Set<string>()

export function shouldSeedTemplatesForUser(userId: string) {
  return !seededUserIds.has(userId)
}

export function markTemplatesSeededForUser(userId: string) {
  seededUserIds.add(userId)
}

export function clearTemplatesSeededForUser(userId: string) {
  seededUserIds.delete(userId)
}

export interface DefaultTemplateSeed {
  name: string
  unit: string
  kcalPerUnit: number
  defaultQuantity: number
}

export const DEFAULT_EXERCISE_TEMPLATES: DefaultTemplateSeed[] = [
  { name: '跑步', unit: '分钟', kcalPerUnit: 10, defaultQuantity: 30 },
  { name: '力量训练', unit: '分钟', kcalPerUnit: 6, defaultQuantity: 45 },
  { name: '游泳', unit: '分钟', kcalPerUnit: 8.75, defaultQuantity: 40 },
  { name: '步行', unit: '分钟', kcalPerUnit: 3.33, defaultQuantity: 60 },
  { name: '骑行', unit: '分钟', kcalPerUnit: 9.33, defaultQuantity: 30 },
  { name: 'HIIT', unit: '分钟', kcalPerUnit: 11, defaultQuantity: 20 },
]

export const DEFAULT_MEAL_TEMPLATES: DefaultTemplateSeed[] = [
  { name: '米饭', unit: 'g', kcalPerUnit: 1.15, defaultQuantity: 200 },
  { name: '鸡胸肉', unit: 'g', kcalPerUnit: 1.65, defaultQuantity: 100 },
  { name: '鸡蛋', unit: '个', kcalPerUnit: 78, defaultQuantity: 1 },
  { name: '牛奶', unit: 'ml', kcalPerUnit: 0.6, defaultQuantity: 250 },
  { name: '香蕉', unit: '根', kcalPerUnit: 105, defaultQuantity: 1 },
  { name: '全麦面包', unit: '片', kcalPerUnit: 80, defaultQuantity: 1 },
  { name: '牛肉', unit: 'g', kcalPerUnit: 2.5, defaultQuantity: 100 },
  { name: '沙拉', unit: '碗', kcalPerUnit: 120, defaultQuantity: 1 },
]

export interface MealPhotoQuota {
  limit: number
  used: number
  remaining: number | null
  unlimited: boolean
  dateKey: string
}

export function isMealPhotoQuotaExhausted(quota: MealPhotoQuota | null): boolean {
  if (!quota) return false
  if (quota.unlimited) return false
  return (quota.remaining ?? 0) <= 0
}

export function mealPhotoQuotaProgress(quota: MealPhotoQuota): number {
  if (quota.unlimited) return 100
  if (quota.limit <= 0) return 0
  const remaining = quota.remaining ?? 0
  return Math.max(0, Math.min(100, (remaining / quota.limit) * 100))
}

export function mealPhotoQuotaTone(
  quota: MealPhotoQuota,
): 'ok' | 'low' | 'empty' | 'dev' {
  if (quota.unlimited) return 'dev'
  const remaining = quota.remaining ?? 0
  if (remaining <= 0) return 'empty'
  if (remaining <= 5) return 'low'
  return 'ok'
}

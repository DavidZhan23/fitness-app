import type { CSSProperties } from 'react'
import type { MealPhotoQuota } from '../../lib/mealPhotoQuota'
import {
  mealPhotoQuotaProgress,
  mealPhotoQuotaTone,
} from '../../lib/mealPhotoQuota'

interface MealPhotoQuotaBadgeProps {
  quota: MealPhotoQuota | null
  loading?: boolean
}

export function MealPhotoQuotaBadge({
  quota,
  loading = false,
}: MealPhotoQuotaBadgeProps) {
  if (loading && !quota) {
    return (
      <div className="meal-photo-quota meal-photo-quota--loading" aria-busy="true">
        <div className="meal-photo-quota__ring meal-photo-quota__ring--placeholder" />
        <div className="meal-photo-quota__copy">
          <p className="meal-photo-quota__title">今日拍照识别</p>
          <p className="meal-photo-quota__subtitle">加载额度…</p>
        </div>
      </div>
    )
  }

  if (!quota) return null

  const tone = mealPhotoQuotaTone(quota)
  const progress = mealPhotoQuotaProgress(quota)
  const displayRemaining = quota.unlimited ? '∞' : String(quota.remaining ?? 0)
  const subtitle = quota.unlimited
    ? '开发者无次数限制'
    : quota.remaining === 0
      ? `今日 ${quota.limit} 次已用完，明天重置`
      : `剩余 ${quota.remaining} / ${quota.limit} 次 · 每日重置`

  return (
    <div
      className={`meal-photo-quota meal-photo-quota--${tone}`}
      aria-label={
        quota.unlimited
          ? '今日拍照识别剩余次数无限制'
          : `今日拍照识别剩余 ${quota.remaining} 次，共 ${quota.limit} 次`
      }
    >
      <div
        className="meal-photo-quota__ring"
        style={{ '--quota-progress': `${progress}%` } as CSSProperties}
      >
        <span className="meal-photo-quota__remaining">{displayRemaining}</span>
      </div>
      <div className="meal-photo-quota__copy">
        <p className="meal-photo-quota__title">今日拍照识别</p>
        <p className="meal-photo-quota__subtitle">{subtitle}</p>
      </div>
    </div>
  )
}

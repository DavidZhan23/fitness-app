import {
  computeCommunityDeficit,
  computeCommunityMetabolism,
} from '../lib/communityDeficit'
import { getMetabolismStatLabel } from '../lib/metabolism'
import type { CommunityDaySnapshot, Profile } from '../types'
import { DeficitCard } from './DeficitCard'

interface CommunityDaySummaryProps {
  snapshot: CommunityDaySnapshot
  dateLabel: string
  todayKey: string
  viewerProfile?: Profile | null
  isSelf?: boolean
}

/** 社区公开主页 / 用户日动态：与今日页共用 DeficitCard，保证各主题配色一致 */
export function CommunityDaySummary({
  snapshot,
  dateLabel,
  todayKey,
  viewerProfile,
  isSelf,
}: CommunityDaySummaryProps) {
  const { exerciseKcal, mealKcal, threshold, date } = snapshot
  const opts = { viewerProfile, isSelf }

  return (
    <DeficitCard
      dateLabel={dateLabel}
      deficit={computeCommunityDeficit(snapshot, opts)}
      metabolismKcal={computeCommunityMetabolism(snapshot, opts)}
      metabolismLabel={getMetabolismStatLabel(date, todayKey)}
      exerciseKcal={exerciseKcal}
      mealKcal={mealKcal}
      threshold={threshold}
    />
  )
}

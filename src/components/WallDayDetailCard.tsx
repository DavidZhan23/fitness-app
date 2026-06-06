import { PersonalDayStatus } from './CommunityDayStatus'

interface WallDayDetailCardProps {
  dateKey: string
  todayKey: string
  bmr: number
  tdee: number
  exerciseKcal: number
  mealKcal: number
  deficit: number
  dailyBmr: number
  detailBgClass: string
  onClose: () => void
}

export function WallDayDetailCard({
  dateKey,
  todayKey,
  bmr,
  tdee,
  exerciseKcal,
  mealKcal,
  deficit,
  dailyBmr,
  detailBgClass,
  onClose,
}: WallDayDetailCardProps) {
  return (
    <section
      id="calendar-day-detail"
      className={`scroll-mt-4 calendar-day-detail p-4 ${detailBgClass}`}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-medium">
          {dateKey === todayKey ? '今日小结' : '当日小结'}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="btn-soft px-2 py-1 text-xs"
          aria-label="关闭当日详情"
        >
          关闭
        </button>
      </div>
      <div className="mt-2 grid grid-cols-[minmax(0,1fr)_minmax(7.5rem,9.5rem)] items-start gap-3 sm:grid-cols-[minmax(0,1fr)_220px] sm:gap-4">
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
          <Item label="基础代谢 (BMR)" value={bmr} />
          <Item label="运动消耗" value={exerciseKcal} />
          <Item label="全日总消耗 (TDEE)" value={tdee} />
          <Item label="饮食摄入" value={mealKcal} />
          <Item label="热量缺口" value={deficit} highlight />
        </dl>
        <PersonalDayStatus
          variant="side"
          deficit={deficit}
          exerciseKcal={exerciseKcal}
          mealKcal={mealKcal}
          dailyBmr={dailyBmr}
        />
      </div>
      <p className="mt-2 text-xs text-muted">
        基础代谢计入方式以用户的偏好设置为准
      </p>
    </section>
  )
}

function Item({
  label,
  value,
  highlight,
}: {
  label: string
  value: number
  highlight?: boolean
}) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd
        className={`mt-0.5 font-semibold tabular-nums ${
          highlight ? 'text-emerald-400' : ''
        }`}
      >
        {Math.round(value)} kcal
      </dd>
    </div>
  )
}

import type { TodayHonor } from '../lib/todayHonors'
import { TODAY_HONOR_STRIP } from '../lib/todayHonors'

interface TodayFeedbackCardProps {
  exerciseCount: number
  mealCount: number
  honors: TodayHonor[]
}

export function TodayFeedbackCard({
  exerciseCount,
  mealCount,
  honors,
}: TodayFeedbackCardProps) {
  const exerciseHonors = honors.filter((h) => h.category === 'exercise')
  const mealHonors = honors.filter((h) => h.category === 'meal')
  const generalHonors = honors.filter((h) => h.category === 'general')

  return (
    <section className="today-feedback-card" aria-label="今日反馈">
      <div className="today-feedback-walls">
        <FeedbackWall
          title="运动墙"
          lit={exerciseCount > 0}
          litLabel="今日已点亮"
          unlitLabel="未点亮"
          countLine={
            exerciseCount > 0
              ? `运动 ${exerciseCount} 条`
              : '记录一次运动后点亮'
          }
          tone="exercise"
          honors={exerciseHonors}
        />
        <FeedbackWall
          title="美食墙"
          lit={mealCount > 0}
          litLabel="今日已点亮"
          unlitLabel="未点亮"
          countLine={
            mealCount > 0
              ? `饮食 ${mealCount} 条`
              : '记录一餐饮食后点亮'
          }
          tone="meal"
          honors={mealHonors}
        />
      </div>

      {generalHonors.length > 0 ? (
        <div className="today-feedback-general">
          {generalHonors.map((honor) => (
            <HonorBanner key={honor.key} honor={honor} />
          ))}
        </div>
      ) : null}
    </section>
  )
}

function FeedbackWall({
  title,
  lit,
  litLabel,
  unlitLabel,
  countLine,
  tone,
  honors,
}: {
  title: string
  lit: boolean
  litLabel: string
  unlitLabel: string
  countLine: string
  tone: 'exercise' | 'meal'
  honors: TodayHonor[]
}) {
  const statusLabel = lit ? litLabel : unlitLabel

  return (
    <article
      className={`today-feedback-wall today-feedback-wall--${tone}${
        lit ? ' today-feedback-wall--lit' : ''
      }`}
      aria-label={title}
    >
      <div className="today-feedback-wall__header">
        <h3 className="today-feedback-wall__title">{title}</h3>
        <span
          className={`today-feedback-wall__status today-feedback-wall__status--${
            lit ? 'lit' : 'unlit'
          }`}
        >
          {statusLabel}
        </span>
      </div>
      <p className="today-feedback-wall__count">{countLine}</p>
      {honors.length > 0 ? (
        <div className="today-feedback-wall__honors">
          {honors.map((honor) => (
            <HonorBanner key={honor.key} honor={honor} compact />
          ))}
        </div>
      ) : null}
    </article>
  )
}

function HonorBanner({
  honor,
  compact = false,
}: {
  honor: TodayHonor
  compact?: boolean
}) {
  const tone = TODAY_HONOR_STRIP[honor.key].tone

  return (
    <div
      className={`today-feedback-honor today-status-strip today-status-strip--${tone}${
        compact ? ' today-feedback-honor--compact' : ''
      }`}
    >
      <div className="today-status-strip__icon" aria-hidden>
        {honor.icon}
      </div>
      <div className="today-status-strip__content">
        <div className="today-status-strip__title">{honor.title}</div>
        <div className="today-status-strip__desc">{honor.desc}</div>
      </div>
    </div>
  )
}

import type { UserWeeklyReport } from '../types'

type Props = {
  report: UserWeeklyReport
  onView: () => void
  onLater: () => void
}

function metric(value: number | null, suffix: string) {
  return value == null ? '待补充' : `${Math.round(value)}${suffix}`
}

export function WeeklyReportArrivalSheet({ report, onView, onLater }: Props) {
  return (
    <div className="weekly-arrival" role="dialog" aria-modal="true" aria-labelledby="weekly-arrival-title">
      <button className="weekly-arrival__backdrop" type="button" aria-label="稍后再看" onClick={onLater} />
      <section className="weekly-arrival__sheet">
        <div className="weekly-arrival__handle" aria-hidden />
        <div className="weekly-arrival__fox" aria-hidden>🦊</div>
        <p className="weekly-arrival__eyebrow">WEEKLY LETTER</p>
        <h2 id="weekly-arrival-title">小满周报已送达</h2>
        <p className="weekly-arrival__copy">小狸已经帮你整理好上周表现啦</p>
        <div className="weekly-arrival__metrics">
          <span><strong>{report.summary.activeDays}</strong>运动天数</span>
          <span><strong>{metric(report.summary.totalCalorieDeficit, ' kcal')}</strong>热量缺口</span>
          <span><strong>{report.summary.achievementCount}</strong>成就卡</span>
        </div>
        <button type="button" className="weekly-arrival__primary" onClick={onView}>查看我的周报</button>
        <button type="button" className="weekly-arrival__secondary" onClick={onLater}>稍后再看</button>
      </section>
    </div>
  )
}

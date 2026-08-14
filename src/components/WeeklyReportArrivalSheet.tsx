import type { UserWeeklyReport } from '../types'

type Props = {
  report: UserWeeklyReport
  onView: () => void
  onLater: () => void
}

export function WeeklyReportArrivalSheet({ report, onView, onLater }: Props) {
  const headline = report.headline || report.summary.overallTitle
  return (
    <div className="weekly-arrival" role="dialog" aria-modal="true" aria-labelledby="weekly-arrival-title">
      <button className="weekly-arrival__backdrop" type="button" aria-label="稍后再看" onClick={onLater} />
      <section className="weekly-arrival__sheet">
        <div className="weekly-arrival__handle" aria-hidden />
        <div className="weekly-arrival__fox" aria-hidden>🦊</div>
        <p className="weekly-arrival__eyebrow">小满周报已送达</p>
        <h2 id="weekly-arrival-title">{headline}</h2>
        <p className="weekly-arrival__copy">小狸把本周事实和下周小目标都整理好了</p>
        <button type="button" className="weekly-arrival__primary" onClick={onView}>查看我的周报</button>
        <button type="button" className="weekly-arrival__secondary" onClick={onLater}>稍后再看</button>
      </section>
    </div>
  )
}

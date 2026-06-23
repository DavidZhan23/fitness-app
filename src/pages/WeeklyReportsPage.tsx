import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  WeeklyReportErrorBoundary,
  WeeklyReportScaffold,
} from '../components/WeeklyReportScaffold'
import { httpData } from '../lib/api'
import { formatWeeklyDateLabel, normalizeUserWeeklyReport } from '../lib/userWeeklyReport'
import type { UserWeeklyReport } from '../types'

function WeeklyReportsPageContent() {
  const [reports, setReports] = useState<UserWeeklyReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    httpData
      .listUserWeeklyReports()
      .then((data) => {
        if (!active) return
        setReports(
          data.reports
            .map((report) => normalizeUserWeeklyReport(report))
            .filter((report): report is UserWeeklyReport => report != null),
        )
      })
      .catch((err) =>
        active && setError(err instanceof Error ? err.message : '周报加载失败'),
      )
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  return (
    <WeeklyReportScaffold
      subtitle="和小狸走过的每一周"
      className="weekly-history-page"
    >
      {loading && <div className="weekly-state-card">小狸正在翻找你的周报…</div>}
      {error && <div className="weekly-state-card weekly-state-card--error">{error}</div>}
      {!loading && !error && reports.length === 0 && (
        <div className="weekly-state-card">
          <span aria-hidden>🦊</span>
          <h2>第一份周报还在路上</h2>
          <p>上周有打卡记录后，每周一会在设置里收到小狸整理的周报。</p>
          <Link to="/settings">返回设置</Link>
        </div>
      )}
      <div className="weekly-history-list">
        {reports.map((report) => (
          <Link
            key={report.id}
            to={`/weekly-reports/${report.id}`}
            className="weekly-history-item"
          >
            <div className="weekly-history-item__top">
              <span>
                第 {report.weekNumber} 周 · {formatWeeklyDateLabel(report.weekStartDate, 'short')}–
                {formatWeeklyDateLabel(report.weekEndDate, 'short')}
              </span>
              {!report.isViewed && <i>未读</i>}
            </div>
            <h2>{report.summary.overallTitle}</h2>
            <div className="weekly-history-item__metrics">
              <span>
                <strong>{report.summary.activeDays}</strong>运动天
              </span>
              <span>
                <strong>
                  {report.summary.totalCalorieDeficit == null
                    ? '—'
                    : Math.round(report.summary.totalCalorieDeficit)}
                </strong>
                缺口 kcal
              </span>
              <span>
                <strong>{report.summary.achievementCount}</strong>成就
              </span>
            </div>
          </Link>
        ))}
      </div>
    </WeeklyReportScaffold>
  )
}

export function WeeklyReportsPage() {
  return (
    <WeeklyReportErrorBoundary>
      <WeeklyReportsPageContent />
    </WeeklyReportErrorBoundary>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { httpData } from '../lib/api'
import { formatWeeklyDateLabel } from '../lib/userWeeklyReport'
import type { CommunitySharedWeeklyReportSummary } from '../types'

type Props = {
  userId: string
  nickname: string
  isSelf: boolean
}

export function CommunityWeeklyReportsSection({ userId, nickname, isSelf }: Props) {
  const [reports, setReports] = useState<CommunitySharedWeeklyReportSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    httpData
      .listCommunityUserWeeklyReports(userId)
      .then((data) => active && setReports(data.reports))
      .catch((err) =>
        active && setError(err instanceof Error ? err.message : '周报加载失败'),
      )
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [userId])

  if (loading) {
    return (
      <section className="surface-card rounded-2xl p-4">
        <h2 className="font-medium text-primary">小满周报</h2>
        <p className="mt-2 text-xs text-muted">加载周报…</p>
      </section>
    )
  }

  if (error) return null

  if (reports.length === 0) {
    if (!isSelf) return null
    return (
      <section className="surface-card rounded-2xl p-4">
        <h2 className="font-medium text-primary">小满周报</h2>
        <p className="mt-2 text-sm text-muted">
          打开任意一份周报，点击「分享到社区」，好友就能在这里看到你的上周总结。
        </p>
        <Link to="/weekly-reports" className="mt-3 inline-block text-sm text-brand">
          去我的周报 →
        </Link>
      </section>
    )
  }

  return (
    <section className="surface-card rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-medium text-primary">小满周报</h2>
        {isSelf && (
          <Link to="/weekly-reports" className="text-xs text-brand">
            管理周报
          </Link>
        )}
      </div>
      <div className="weekly-community-list">
        {reports.map((report) => (
          <Link
            key={report.id}
            to={`/community/${userId}/weekly-reports/${report.id}`}
            className="weekly-community-item"
          >
            <div className="weekly-community-item__top">
              <span>
                第 {report.weekNumber} 周 ·{' '}
                {formatWeeklyDateLabel(report.weekStartDate, 'short')}–
                {formatWeeklyDateLabel(report.weekEndDate, 'short')}
              </span>
            </div>
            <h3>{report.overallTitle}</h3>
            <p className="weekly-community-item__meta">
              {isSelf ? '你已分享到社区' : `${nickname} 的周报`}
              {' · '}
              运动 {report.activeDays} 天 · 缺口{' '}
              {report.totalCalorieDeficit == null
                ? '—'
                : Math.round(report.totalCalorieDeficit)}{' '}
              kcal
            </p>
          </Link>
        ))}
      </div>
    </section>
  )
}

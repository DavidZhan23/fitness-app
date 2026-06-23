import { Link } from 'react-router-dom'
import type { UserWeeklyReport } from '../types'

type Props = {
  report: UserWeeklyReport | null
  loading?: boolean
  error?: boolean
}

export function WeeklyReportEntryCard({ report, loading, error }: Props) {
  if (loading) {
    return (
      <section className="weekly-entry weekly-entry--loading" aria-label="周报加载中">
        <span className="weekly-entry__fox" aria-hidden>🦊</span>
        <div>
          <strong>小狸正在整理周报</strong>
          <p>翻一翻上周的记录，很快就好</p>
        </div>
      </section>
    )
  }

  if (!report || error) {
    return (
      <section className="weekly-entry">
        <span className="weekly-entry__fox" aria-hidden>🦊</span>
        <div className="min-w-0">
          <strong>下周一生成你的专属周报</strong>
          <p>{error ? '这次连接没有成功，稍后再来看看' : '继续记录运动和饮食，小满会帮你总结'}</p>
        </div>
      </section>
    )
  }

  return (
    <Link
      to={`/weekly-reports/${report.id}`}
      className={`weekly-entry ${report.isViewed ? '' : 'weekly-entry--unread'}`}
    >
      <span className="weekly-entry__fox" aria-hidden>🦊</span>
      <span className="min-w-0 flex-1">
        <span className="weekly-entry__title">
          {report.isViewed ? '查看本周周报' : '小满周报已送达'}
          {!report.isViewed && <i className="weekly-entry__dot" aria-label="未读" />}
        </span>
        <span className="weekly-entry__subtitle">
          {report.isViewed ? '回顾一下你和小狸的努力' : '小狸整理了你的上周表现'}
        </span>
      </span>
      <span className="weekly-entry__action">查看</span>
    </Link>
  )
}

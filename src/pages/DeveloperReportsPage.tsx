import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { httpData } from '../lib/api'
import type { WeeklyReportSummary } from '../types'

function formatDateRange(start: string, end: string) {
  const s = start.slice(0, 10)
  const e = end.slice(0, 10)
  return `${s} – ${e}`
}

function statusLabel(status: string) {
  if (status === 'final') return '已定稿'
  if (status === 'draft') return '草稿（AI 未就绪）'
  return status
}

export function DeveloperReportsPage() {
  const navigate = useNavigate()
  const [reports, setReports] = useState<WeeklyReportSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const data = await httpData.listWeeklyReports()
        if (!cancelled) setReports(data.reports)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '加载失败')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="page-standalone">
      <div className="mx-auto w-full max-w-lg space-y-4 px-4 pb-8 pt-4">
        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="text-muted hover:text-slate-200"
            aria-label="返回设置"
          >
            ←
          </button>
          <h1 className="text-xl font-bold">开发者后台</h1>
        </header>

        <p className="text-sm text-muted">
          每周质量报告（路由耗时、AI 估算成功率等）。数据来自生产埋点，每周一自动生成。
        </p>

        {loading && <p className="text-sm text-muted">加载中…</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}

        {!loading && !error && reports.length === 0 && (
          <div className="rounded-xl border border-slate-600/50 bg-card p-4 text-sm text-muted">
            暂无周报。请确认后端已配置 <code className="text-slate-300">DEVELOPER_EMAILS</code>
            ，且至少生成过一周数据（周一 cron 或手动 regenerate）。
          </div>
        )}

        <ul className="space-y-2">
          {reports.map((r) => (
            <li key={r.week_id}>
              <Link
                to={`/dev/reports/${r.week_id}`}
                className="block rounded-xl border border-slate-600/50 bg-card px-4 py-3 transition hover:border-brand/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-brand">{r.week_id}</span>
                  <span className="text-xs text-muted">{statusLabel(r.status)}</span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {formatDateRange(r.week_start_date, r.week_end_date)}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  来源：{r.generated_by}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

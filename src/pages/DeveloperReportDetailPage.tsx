import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { httpData } from '../lib/api'
import type { WeeklyReportDetail } from '../types'

const devActionBtnClass =
  'rounded-lg border border-brand/50 px-3 py-1.5 text-sm text-brand transition hover:bg-brand/10 disabled:opacity-50'

export function DeveloperReportDetailPage() {
  const { week } = useParams<{ week: string }>()
  const [report, setReport] = useState<WeeklyReportDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [regenerating, setRegenerating] = useState(false)
  const [copyHint, setCopyHint] = useState('')
  const copyHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    if (!week) return
    setLoading(true)
    setError('')
    try {
      const data = await httpData.getWeeklyReport(week)
      setReport(data)
    } catch (err) {
      setReport(null)
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [week])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    return () => {
      if (copyHintTimer.current) clearTimeout(copyHintTimer.current)
    }
  }, [])

  const handleRegenerate = async () => {
    if (!week || !confirm(`重新生成 ${week} 周报？将覆盖数据库中的现有记录。`)) {
      return
    }
    setRegenerating(true)
    setError('')
    try {
      await httpData.regenerateWeeklyReport(week)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '重新生成失败')
    } finally {
      setRegenerating(false)
    }
  }

  const handleCopy = async () => {
    if (!report?.report_md) return
    try {
      await navigator.clipboard.writeText(report.report_md)
      setCopyHint('已经复制进剪贴板')
      if (copyHintTimer.current) clearTimeout(copyHintTimer.current)
      copyHintTimer.current = setTimeout(() => setCopyHint(''), 2500)
    } catch {
      setCopyHint('复制失败，请手动选择正文复制')
      if (copyHintTimer.current) clearTimeout(copyHintTimer.current)
      copyHintTimer.current = setTimeout(() => setCopyHint(''), 2500)
    }
  }

  return (
    <div className="page-standalone">
      <div className="mx-auto w-full max-w-lg space-y-4 px-4 pb-8 pt-4">
        <header className="flex items-center gap-3">
          <Link
            to="/dev"
            className="text-muted hover:text-slate-200"
            aria-label="返回列表"
          >
            ←
          </Link>
          <h1 className="text-xl font-bold">{week ?? '周报'}</h1>
        </header>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleRegenerate()}
            disabled={regenerating || !week}
            className={devActionBtnClass}
          >
            {regenerating ? '生成中…' : '重新生成'}
          </button>
          {report?.report_md && (
            <button
              type="button"
              onClick={() => void handleCopy()}
              className={devActionBtnClass}
            >
              复制全文
            </button>
          )}
          {copyHint && (
            <span className="text-sm text-brand" role="status" aria-live="polite">
              {copyHint}
            </span>
          )}
        </div>

        {loading && <p className="text-sm text-muted">加载中…</p>}
        {error && (
          <div className="space-y-2 text-sm text-red-400">
            <p>{error}</p>
            {error.includes('不存在') && week && (
              <button
                type="button"
                onClick={() => void handleRegenerate()}
                disabled={regenerating}
                className="text-brand underline"
              >
                立即生成此周报告
              </button>
            )}
          </div>
        )}

        {report && (
          <article className="dev-report-md rounded-xl border border-slate-600/50 bg-card p-4">
            <pre className="dev-report-md__pre">{report.report_md}</pre>
          </article>
        )}
      </div>
    </div>
  )
}

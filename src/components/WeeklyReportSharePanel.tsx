import { useState } from 'react'
import { Link } from 'react-router-dom'
import { httpData } from '../lib/api'
import { shareWeeklyReportImage } from '../lib/weeklyReportImage'
import { normalizeUserWeeklyReport } from '../lib/userWeeklyReport'
import type { UserWeeklyReport } from '../types'

type Props = {
  report: UserWeeklyReport
  onReportChange: (report: UserWeeklyReport) => void
}

export function WeeklyReportSharePanel({ report, onReportChange }: Props) {
  const [busy, setBusy] = useState<'community' | 'image' | null>(null)
  const [message, setMessage] = useState('')

  const handleCommunityShare = async () => {
    setBusy('community')
    setMessage('')
    try {
      if (report.isSharedToCommunity) {
        const updated = await httpData.unshareUserWeeklyReportFromCommunity(report.id)
        onReportChange(normalizeUserWeeklyReport(updated)!)
        setMessage('已从社区撤下')
        return
      }
      const updated = await httpData.shareUserWeeklyReportToCommunity(report.id)
      onReportChange(normalizeUserWeeklyReport(updated)!)
      setMessage('已分享到社区，好友可在你的社区主页查看')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '分享到社区失败')
    } finally {
      setBusy(null)
    }
  }

  const handleImageShare = async () => {
    setBusy('image')
    setMessage('')
    try {
      const result = await shareWeeklyReportImage(report)
      setMessage(
        result === 'shared'
          ? '请在系统分享面板中选择微信或其他 App 发送长图'
          : '长图已保存到相册/下载目录，可在微信中选择图片发送',
      )
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setMessage(err instanceof Error ? err.message : '长图分享失败')
    } finally {
      setBusy(null)
    }
  }

  return (
    <footer className="weekly-actions weekly-actions--share">
      <div className="weekly-actions__buttons">
        <button
          type="button"
          className={report.isSharedToCommunity ? 'weekly-actions__btn-secondary' : undefined}
          disabled={busy != null}
          onClick={() => void handleCommunityShare()}
        >
          {busy === 'community'
            ? '处理中…'
            : report.isSharedToCommunity
              ? '从社区撤下'
              : '分享到社区'}
        </button>
        <button
          type="button"
          disabled={busy != null}
          onClick={() => void handleImageShare()}
        >
          {busy === 'image' ? '正在生成长图…' : '生成长图分享'}
        </button>
      </div>
      <p className="weekly-actions__hint">
        长图为一整张连续截图，适合微信分享；若未出现分享面板，图片会自动保存到本机。
      </p>
      {message && <p role="status">{message}</p>}
      <div>
        <Link to="/calendar">查看详细记录</Link>
        <Link to="/settings">返回设置</Link>
      </div>
    </footer>
  )
}

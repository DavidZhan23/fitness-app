import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCommunityInbox } from '../hooks/useCommunityInbox'
import { httpData } from '../lib/api'
import type { CommunityInboxItem, CommunityInboxListResponse } from '../types'

type InboxMode = 'unread' | 'history'

const PAGE_SIZE = 20

function formatWhen(iso: string, logDate: string) {
  const today = new Date()
  const y = today.getFullYear()
  const m = String(today.getMonth() + 1).padStart(2, '0')
  const d = String(today.getDate()).padStart(2, '0')
  const todayKey = `${y}-${m}-${d}`
  if (logDate === todayKey) {
    return new Date(iso).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  const [, mm, dd] = logDate.split('-')
  return `${Number(mm)}月${Number(dd)}日`
}

function itemTitle(item: CommunityInboxItem) {
  if (item.kind === 'like') return '赞了你的今日名片'
  if (item.kind === 'dislike') return '踩了你的今日名片'
  if (item.kind === 'comment_on_card') return '在你的名片下留言'
  return '回复了你的留言'
}

function itemToneClass(item: CommunityInboxItem) {
  if (item.kind === 'like') return 'bg-teal-900/30 ring-teal-500/30 text-teal-200'
  if (item.kind === 'dislike') return 'bg-orange-900/30 ring-orange-500/30 text-orange-200'
  if (item.kind === 'comment_on_card') {
    return 'bg-violet-900/30 ring-violet-500/30 text-violet-200'
  }
  return 'bg-rose-900/30 ring-rose-500/30 text-rose-200'
}

function itemEmoji(item: CommunityInboxItem) {
  if (item.kind === 'like') return '👍'
  if (item.kind === 'dislike') return '👎'
  if (item.kind === 'comment_on_card') return '💬'
  return '↩️'
}

function isCommentLike(item: CommunityInboxItem) {
  return item.kind === 'comment_on_card' || item.kind === 'reply'
}

export function CommunityInboxPage() {
  const { markRead, refresh } = useCommunityInbox()
  const [mode, setMode] = useState<InboxMode>('unread')
  const [items, setItems] = useState<CommunityInboxItem[]>([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const markedRef = useRef(false)

  const applyData = useCallback((data: CommunityInboxListResponse, append: boolean) => {
    setTotal(data.total)
    setHasMore(data.hasMore)
    setItems((prev) => (append ? [...prev, ...data.items] : data.items))
  }, [])

  const load = useCallback(
    async (nextMode: InboxMode, append = false) => {
      if (append) setLoadingMore(true)
      else setLoading(true)
      setError('')
      try {
        const data = await httpData.getCommunityInboxList(nextMode, {
          limit: PAGE_SIZE,
          offset: append ? items.length : 0,
        })
        applyData(data, append)
        if (nextMode === 'unread' && !markedRef.current) {
          markedRef.current = true
          await markRead()
          await refresh()
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载互动失败')
      } finally {
        if (append) setLoadingMore(false)
        else setLoading(false)
      }
    },
    [applyData, items.length, markRead, refresh],
  )

  useEffect(() => {
    void load(mode)
  }, [load, mode])

  return (
    <div className="space-y-4 pb-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-primary">互动消息</h1>
          <p className="text-xs text-muted">
            {mode === 'unread' ? '未读互动会集中展示在这里' : '历史互动按时间倒序展示'}
          </p>
        </div>
        <Link to="/community" className="text-xs text-muted hover:text-primary">
          返回社区
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMode('unread')}
          className={`rounded-full px-3 py-1.5 text-xs ring-1 transition ${
            mode === 'unread'
              ? 'bg-violet-500/20 text-violet-100 ring-violet-400/35'
              : 'text-muted ring-[var(--surface-card-border)] hover:text-primary'
          }`}
        >
          未读互动
        </button>
        <button
          type="button"
          onClick={() => setMode('history')}
          className={`rounded-full px-3 py-1.5 text-xs ring-1 transition ${
            mode === 'history'
              ? 'bg-violet-500/20 text-violet-100 ring-violet-400/35'
              : 'text-muted ring-[var(--surface-card-border)] hover:text-primary'
          }`}
        >
          历史互动
        </button>
      </div>

      {mode === 'unread' && (
        <button
          type="button"
          onClick={() => setMode('history')}
          className="rounded-xl px-3 py-2 text-xs text-violet-200 ring-1 ring-violet-400/30 transition hover:bg-violet-500/15"
        >
          查看历史互动
        </button>
      )}

      {loading ? (
        <p className="py-10 text-center text-sm text-muted">加载互动中…</p>
      ) : error ? (
        <p className="py-10 text-center text-sm text-danger">
          {error}
          <button
            type="button"
            onClick={() => void load(mode)}
            className="ml-2 text-brand underline"
          >
            重试
          </button>
        </p>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted">
          {mode === 'unread' ? '暂无未读互动' : '暂无历史互动'}
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, idx) => {
            const canJump = isCommentLike(item)
            const row = (
              <span className="flex items-start gap-2.5">
                <span
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm ring-1 ${itemToneClass(item)}`}
                  aria-hidden
                >
                  {itemEmoji(item)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-xs leading-snug text-primary">
                    <span className="font-medium">{item.actorNickname}</span>{' '}
                    {itemTitle(item)}
                    <span className="ml-1.5 text-muted">
                      {formatWhen(item.createdAt, item.logDate)}
                    </span>
                  </span>
                  {item.bodyPreview && (
                    <span className="mt-0.5 block truncate text-[11px] text-muted">
                      「{item.bodyPreview}」
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-[10px] text-muted">
                  {canJump ? '查看 →' : '互动记录'}
                </span>
              </span>
            )
            return (
              <li
                key={`${item.kind}-${item.createdAt}-${idx}`}
                className="rounded-xl border border-[var(--surface-card-border)] px-3 py-2.5"
              >
                {canJump ? (
                  <Link
                    to={`/community/${item.targetUserId}#day-comments`}
                    className="block transition hover:opacity-90"
                  >
                    {row}
                  </Link>
                ) : (
                  row
                )}
              </li>
            )
          })}
        </ul>
      )}

      {!loading && items.length > 0 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-muted">共 {total} 条互动</p>
          {hasMore && (
            <button
              type="button"
              onClick={() => void load(mode, true)}
              disabled={loadingMore}
              className="rounded-lg px-2.5 py-1 text-xs text-violet-200 ring-1 ring-violet-400/30 transition hover:bg-violet-500/15 disabled:opacity-50"
            >
              {loadingMore ? '加载中…' : '加载更多'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

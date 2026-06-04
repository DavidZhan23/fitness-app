import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { UserAvatar } from '../components/UserAvatar'
import { SegmentedControl } from '../components/ui/responsive'
import { useCommunityInbox } from '../hooks/useCommunityInbox'
import { httpData } from '../lib/api'
import { inboxItemHref } from '../lib/communityInboxNav'
import { formatDateKey, normalizeDateKey } from '../lib/streaks'
import type { CommunityInboxItem, CommunityInboxListResponse } from '../types'

type InboxMode = 'unread' | 'history'
type DateGroupKey = 'today' | 'yesterday' | 'earlier'

const PAGE_SIZE = 20

const INTERACTION_KINDS = new Set<CommunityInboxItem['kind']>([
  'like',
  'dislike',
  'comment_on_card',
  'reply',
  'comment_like',
  'comment_dislike',
])

const GROUP_LABELS: Record<DateGroupKey, string> = {
  today: '今天',
  yesterday: '昨天',
  earlier: '更早',
}

function filterInteractionItems(items: CommunityInboxItem[]) {
  return items.filter((item) => INTERACTION_KINDS.has(item.kind))
}

function getYesterdayDateKey() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return formatDateKey(d)
}

function getDateGroupKey(iso: string): DateGroupKey {
  const dateKey = normalizeDateKey(iso)
  const todayKey = formatDateKey()
  if (dateKey === todayKey) return 'today'
  if (dateKey === getYesterdayDateKey()) return 'yesterday'
  return 'earlier'
}

function groupInboxItems(items: CommunityInboxItem[]) {
  const order: DateGroupKey[] = ['today', 'yesterday', 'earlier']
  const buckets: Record<DateGroupKey, CommunityInboxItem[]> = {
    today: [],
    yesterday: [],
    earlier: [],
  }
  for (const item of items) {
    buckets[getDateGroupKey(item.createdAt)].push(item)
  }
  return order
    .filter((key) => buckets[key].length > 0)
    .map((key) => ({
      key,
      label: GROUP_LABELS[key],
      items: buckets[key],
    }))
}

function formatLogDateLabel(logDate: string | null | undefined) {
  if (!logDate || !/^\d{4}-\d{2}-\d{2}$/.test(logDate)) return '当日'
  const [, mm, dd] = logDate.split('-')
  const m = Number(mm)
  const d = Number(dd)
  if (!Number.isFinite(m) || !Number.isFinite(d)) return '当日'
  return `${m}月${d}日`
}

function formatItemTime(iso: string, groupKey: DateGroupKey) {
  const time = new Date(iso).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })
  if (groupKey === 'today' || groupKey === 'yesterday') return time
  const dateKey = normalizeDateKey(iso)
  const [, mm, dd] = dateKey.split('-')
  return `${Number(mm)}/${Number(dd)} ${time}`
}

function itemActionText(item: CommunityInboxItem) {
  const logLabel = formatLogDateLabel(item.logDate)
  if (item.kind === 'like') return `赞了你 ${logLabel}的记录`
  if (item.kind === 'dislike') return `踩了你 ${logLabel}的记录`
  if (item.kind === 'comment_on_card') return `评论了你 ${logLabel}的记录`
  if (item.kind === 'comment_like') return '赞了你的评论'
  if (item.kind === 'comment_dislike') return '踩了你的评论'
  return '回复了你的评论'
}

function InboxItemRow({
  item,
  groupKey,
  onView,
}: {
  item: CommunityInboxItem
  groupKey: DateGroupKey
  onView?: () => void
}) {
  return (
    <Link
      to={inboxItemHref(item)}
      className="community-inbox-row"
      onClick={() => onView?.()}
    >
      <UserAvatar
        variant="community"
        size="sm"
        nickname={item.actorNickname}
        avatarUrl={item.actorAvatarUrl}
      />
      <span className="community-inbox-row__main">
        <span className="community-inbox-row__title">
          <span className="font-medium">{item.actorNickname}</span>{' '}
          {itemActionText(item)}
        </span>
        {item.bodyPreview && (
          <span className="community-inbox-row__quote">
            「{item.bodyPreview}」
          </span>
        )}
      </span>
      <span className="community-inbox-row__aside">
        <span className="community-inbox-row__time">
          {formatItemTime(item.createdAt, groupKey)}
        </span>
        <span className="community-inbox-action">查看</span>
      </span>
    </Link>
  )
}

export function CommunityInboxPage() {
  const { markItemRead, markRead } = useCommunityInbox()
  const [mode, setMode] = useState<InboxMode>('unread')
  const [items, setItems] = useState<CommunityInboxItem[]>([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)
  const [error, setError] = useState('')
  const rawOffsetRef = useRef(0)

  const showMarkAllRead =
    mode === 'unread' && !loading && (items.length > 0 || total > 0 || hasMore)

  const groupedItems = useMemo(() => groupInboxItems(items), [items])

  const showFinalEmpty = !loading && !loadingMore && items.length === 0 && !hasMore
  const showFilteredEmptyLoading =
    !loading && !loadingMore && items.length === 0 && hasMore

  const applyData = useCallback(
    (data: CommunityInboxListResponse, append: boolean) => {
      setTotal(data.total)
      setHasMore(data.hasMore)
      const filtered = filterInteractionItems(data.items)
      setItems((prev) => (append ? [...prev, ...filtered] : filtered))
      if (append) {
        rawOffsetRef.current += data.items.length
      } else {
        rawOffsetRef.current = data.items.length
      }
    },
    [],
  )

  const load = useCallback(
    async (nextMode: InboxMode, append = false, offset = 0) => {
      if (append) setLoadingMore(true)
      else setLoading(true)
      setError('')
      try {
        const data = await httpData.getCommunityInboxList(nextMode, {
          limit: PAGE_SIZE,
          offset,
        })
        applyData(data, append)
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载互动失败')
      } finally {
        if (append) setLoadingMore(false)
        else setLoading(false)
      }
    },
    [applyData],
  )

  const handleItemView = useCallback(
    (item: CommunityInboxItem) => {
      if (mode !== 'unread') return
      setItems((prev) => prev.filter((row) => row.id !== item.id))
      setTotal((prev) => Math.max(0, prev - 1))
      void markItemRead(item.id)
    },
    [markItemRead, mode],
  )

  const handleMarkAllRead = useCallback(async () => {
    if (markingAll) return
    setMarkingAll(true)
    setError('')
    const ok = await markRead()
    if (!ok) {
      setError('一键已读失败，请稍后重试')
      setMarkingAll(false)
      return
    }
    setItems([])
    setTotal(0)
    setHasMore(false)
    rawOffsetRef.current = 0
    setMarkingAll(false)
  }, [markRead, markingAll])

  useEffect(() => {
    rawOffsetRef.current = 0
    void load(mode)
  }, [load, mode])

  useEffect(() => {
    if (loading || loadingMore || error || items.length > 0 || !hasMore) return
    void load(mode, true, rawOffsetRef.current)
  }, [error, hasMore, items.length, load, loading, loadingMore, mode])

  return (
    <div className="space-y-3 pb-2">
      <header className="community-inbox-header">
        <div>
          <h1 className="community-inbox-header__title">互动消息</h1>
          <p className="community-inbox-header__desc">
            赞、踩、评论和回复会出现在这里
          </p>
        </div>
        <div className="community-inbox-header__actions">
          {showMarkAllRead && (
            <button
              type="button"
              className="community-inbox-mark-all"
              disabled={markingAll || loadingMore}
              onClick={() => void handleMarkAllRead()}
            >
              {markingAll ? '处理中…' : '一键已读'}
            </button>
          )}
          <Link to="/community" className="community-inbox-back">
            返回社区
          </Link>
        </div>
      </header>

      <SegmentedControl
        columns={2}
        className="community-segment"
        role="tablist"
        aria-label="互动消息筛选"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'unread'}
          onClick={() => setMode('unread')}
          className={`community-segment__tab ${mode === 'unread' ? 'community-segment__tab--active' : ''}`}
        >
          未读
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'history'}
          onClick={() => setMode('history')}
          className={`community-segment__tab ${mode === 'history' ? 'community-segment__tab--active' : ''}`}
        >
          历史
        </button>
      </SegmentedControl>

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
      ) : showFinalEmpty ? (
        <div className="community-empty">
          <p className="community-empty__title">
            {mode === 'unread' ? '暂无未读互动' : '暂无历史互动'}
          </p>
          <p className="community-empty__desc">
            {mode === 'unread'
              ? '收到新的赞、踩、评论和回复时会出现在这里'
              : '你收到过的赞、踩、评论和回复会保存在这里'}
          </p>
        </div>
      ) : showFilteredEmptyLoading ? (
        <div className="py-10 text-center">
          <p className="text-sm text-muted">加载互动中…</p>
          <button
            type="button"
            onClick={() => void load(mode, true, rawOffsetRef.current)}
            disabled={loadingMore}
            className="btn-soft mt-3 rounded-lg px-2.5 py-1 text-xs disabled:opacity-50"
          >
            {loadingMore ? '加载中…' : '加载更多'}
          </button>
        </div>
      ) : (
        <div className="space-y-0">
          {groupedItems.map((group) => (
            <section key={group.key} className="community-inbox-group">
              <h2 className="community-inbox-group__label">{group.label}</h2>
              <ul className="community-inbox-list">
                {group.items.map((item) => (
                  <li key={item.id}>
                    <InboxItemRow
                      item={item}
                      groupKey={group.key}
                      onView={
                        mode === 'unread'
                          ? () => handleItemView(item)
                          : undefined
                      }
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-muted">共 {total} 条互动</p>
          {hasMore && (
            <button
              type="button"
              onClick={() => void load(mode, true, rawOffsetRef.current)}
              disabled={loadingMore}
              className="btn-soft rounded-lg px-2.5 py-1 text-xs disabled:opacity-50"
            >
              {loadingMore ? '加载中…' : '加载更多'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

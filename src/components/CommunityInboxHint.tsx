import { Link } from 'react-router-dom'
import type { CommunityInboxSummary } from '../types'

interface CommunityInboxHintProps {
  summary: CommunityInboxSummary
  selfUserId: string
  onDismiss: () => void
  onGoToSelfCard?: () => void
}

function kindMeta(kind: CommunityInboxSummary['items'][0]['kind']) {
  switch (kind) {
    case 'like':
      return { emoji: '👍', label: '名片被赞', tone: 'teal' }
    case 'comment_on_card':
      return { emoji: '💬', label: '名片留言', tone: 'violet' }
    case 'reply':
      return { emoji: '↩️', label: '回复了我', tone: 'rose' }
  }
}

function itemLink(
  item: CommunityInboxSummary['items'][0],
  selfUserId: string,
): { to: string; hash?: string } {
  if (item.kind === 'like' || item.kind === 'comment_on_card') {
    return { to: `/community/${selfUserId}`, hash: '#day-comments' }
  }
  return { to: `/community/${item.targetUserId}`, hash: '#day-comments' }
}

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

export function CommunityInboxHint({
  summary,
  selfUserId,
  onDismiss,
  onGoToSelfCard,
}: CommunityInboxHintProps) {
  const { likesOnMyCard, commentsOnMyCard, repliesToMe, items } = summary

  const chips = [
    {
      key: 'likes',
      show: likesOnMyCard > 0,
      count: likesOnMyCard,
      emoji: '👍',
      title: '我的名片',
      desc: '收到点赞',
      className:
        'from-teal-600/25 to-cyan-600/15 text-teal-100 ring-teal-500/35',
      onClick: onGoToSelfCard,
    },
    {
      key: 'comments',
      show: commentsOnMyCard > 0,
      count: commentsOnMyCard,
      emoji: '💬',
      title: '我的名片',
      desc: '收到留言',
      className:
        'from-violet-600/25 to-indigo-600/15 text-violet-100 ring-violet-500/35',
      to: `/community/${selfUserId}#day-comments`,
    },
    {
      key: 'replies',
      show: repliesToMe > 0,
      count: repliesToMe,
      emoji: '↩️',
      title: '我的留言',
      desc: '被回复',
      className:
        'from-rose-600/25 to-orange-600/15 text-rose-100 ring-rose-500/35',
      to: items.find((i) => i.kind === 'reply')
        ? `/community/${items.find((i) => i.kind === 'reply')!.targetUserId}#day-comments`
        : `/community/${selfUserId}#day-comments`,
    },
  ].filter((c) => c.show)

  return (
    <section
      className="community-inbox-hint relative overflow-hidden rounded-2xl px-4 py-3.5 ring-1 ring-rose-500/30"
      aria-label="未读互动提示"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-rose-600/12 via-violet-600/8 to-teal-600/10"
        aria-hidden
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="community-inbox-hint__pulse flex h-2 w-2 shrink-0 rounded-full bg-rose-400"
              aria-hidden
            />
            <p className="text-sm font-semibold text-slate-100">
              你有{' '}
              <span className="tabular-nums text-rose-200">{summary.count}</span>{' '}
              条未读互动
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 rounded-lg px-2 py-0.5 text-xs text-slate-400 transition hover:bg-slate-800/80 hover:text-slate-200"
          >
            知道了
          </button>
        </div>

        {chips.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {chips.map((chip) => {
              const inner = (
                <>
                  <span className="text-lg leading-none" aria-hidden>
                    {chip.emoji}
                  </span>
                  <span className="mt-1 block text-[10px] font-medium opacity-90">
                    {chip.title}
                  </span>
                  <span className="block text-[9px] opacity-70">{chip.desc}</span>
                  <span className="mt-1 text-sm font-bold tabular-nums">
                    {chip.count}
                  </span>
                </>
              )
              const boxClass = `flex flex-col items-center rounded-xl bg-gradient-to-b px-2 py-2 text-center ring-1 transition active:scale-[0.98] ${chip.className}`
              if (chip.onClick) {
                return (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={chip.onClick}
                    className={boxClass}
                  >
                    {inner}
                  </button>
                )
              }
              return (
                <Link key={chip.key} to={chip.to!} className={boxClass}>
                  {inner}
                </Link>
              )
            })}
          </div>
        )}

        {items.length > 0 && (
          <ul className="mt-3 space-y-1.5 border-t border-slate-700/40 pt-3">
            {items.map((item, idx) => {
              const meta = kindMeta(item.kind)
              const { to, hash } = itemLink(item, selfUserId)
              return (
                <li key={`${item.kind}-${item.createdAt}-${idx}`}>
                  <Link
                    to={`${to}${hash ?? ''}`}
                    className="flex items-start gap-2.5 rounded-xl px-2 py-1.5 transition hover:bg-slate-800/50"
                  >
                    <span
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm ring-1 ${
                        meta.tone === 'teal'
                          ? 'bg-teal-900/40 ring-teal-500/30'
                          : meta.tone === 'violet'
                            ? 'bg-violet-900/40 ring-violet-500/30'
                            : 'bg-rose-900/40 ring-rose-500/30'
                      }`}
                      aria-hidden
                    >
                      {meta.emoji}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="text-xs leading-snug text-slate-200">
                        <span className="font-medium text-violet-200/95">
                          {item.actorNickname}
                        </span>
                        {item.kind === 'like' && ' 赞了你的今日名片'}
                        {item.kind === 'comment_on_card' && ' 在你的名片下留言'}
                        {item.kind === 'reply' && ' 回复了你的留言'}
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
                    <span className="shrink-0 text-[10px] text-violet-300/90">
                      查看 →
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}

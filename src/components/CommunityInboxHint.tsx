import type { CommunityInboxSummary } from '../types'

interface CommunityInboxHintProps {
  summary: CommunityInboxSummary
  onDismiss: () => void
  onOpenInbox: () => void
}

export function CommunityInboxHint({
  summary,
  onDismiss,
  onOpenInbox,
}: CommunityInboxHintProps) {
  const {
    likesOnMyCard,
    dislikesOnMyCard,
    commentsOnMyCard,
    repliesToMe,
  } = summary

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
          <div className="min-w-0">
            <div className="flex items-center gap-2">
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
            <p className="mt-1 text-xs text-slate-300/90">
              赞 {likesOnMyCard} · 踩 {dislikesOnMyCard} · 评论 {commentsOnMyCard} · 回复{' '}
              {repliesToMe}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={onOpenInbox}
              className="rounded-lg bg-violet-500/20 px-2.5 py-1 text-xs text-violet-100 ring-1 ring-violet-400/30 transition hover:bg-violet-500/30"
            >
              查看互动
            </button>
            <button
              type="button"
              className="rounded-lg px-2 py-0.5 text-xs text-slate-400 transition hover:bg-slate-800/80 hover:text-slate-200"
              onClick={onDismiss}
            >
              稍后
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

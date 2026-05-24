export type CommunityFilter = 'all' | 'following'

interface CommunitySegmentProps {
  value: CommunityFilter
  followingCount: number
  refreshing?: boolean
  onChange: (value: CommunityFilter) => void
}

export function CommunitySegment({
  value,
  followingCount,
  refreshing = false,
  onChange,
}: CommunitySegmentProps) {
  return (
    <div className="relative">
      <div
        className="flex rounded-xl bg-slate-800/80 p-1 ring-1 ring-slate-700/50"
        role="tablist"
        aria-label="社区列表筛选"
      >
        <SegmentButton active={value === 'all'} onClick={() => onChange('all')}>
          全部
        </SegmentButton>
        <SegmentButton
          active={value === 'following'}
          onClick={() => onChange('following')}
        >
          关注
          {followingCount > 0 && (
            <span className="ml-1 rounded-full bg-violet-500/30 px-1.5 py-0.5 text-[10px] tabular-nums text-violet-200">
              {followingCount}
            </span>
          )}
        </SegmentButton>
      </div>
      {refreshing && (
        <span
          className="pointer-events-none absolute -right-1 -top-1 h-2 w-2 animate-pulse rounded-full bg-violet-400"
          aria-label="更新中"
        />
      )}
    </div>
  )
}

function SegmentButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-0.5 rounded-lg py-2 text-sm font-medium transition ${
        active
          ? 'bg-violet-600/40 text-violet-100 shadow-sm ring-1 ring-violet-500/30'
          : 'text-muted hover:text-slate-200'
      }`}
    >
      {children}
    </button>
  )
}

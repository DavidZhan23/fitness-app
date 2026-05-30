import { SegmentedControl } from './ui/responsive'

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
      <SegmentedControl
        columns={2}
        className="community-segment"
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
            <span className="community-segment__badge">{followingCount}</span>
          )}
        </SegmentButton>
      </SegmentedControl>
      {refreshing && (
        <span
          className="pointer-events-none absolute -right-1 -top-1 h-2 w-2 animate-pulse rounded-full bg-brand"
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
      className={`community-segment__tab ${active ? 'community-segment__tab--active' : ''}`}
    >
      {children}
    </button>
  )
}

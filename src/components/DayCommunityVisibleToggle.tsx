interface DayCommunityVisibleToggleProps {
  visible: boolean
  saving?: boolean
  onToggle: () => void
}

/** 社区当日动态：公开 / 隐藏（仅自己的今日卡） */
export function DayCommunityVisibleToggle({
  visible,
  saving = false,
  onToggle,
}: DayCommunityVisibleToggleProps) {
  const label = saving ? '…' : visible ? '今日公开' : '今日隐藏'
  return (
    <button
      type="button"
      disabled={saving}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onToggle()
      }}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap transition disabled:opacity-50 ${
        visible
          ? 'bg-violet-500/25 text-violet-200 ring-1 ring-violet-400/40'
          : 'bg-slate-800 text-muted ring-1 ring-slate-600'
      }`}
      aria-pressed={visible}
      aria-label={visible ? '今日已公开，点击隐藏' : '今日已隐藏，点击公开'}
    >
      <span
        aria-hidden
        className={`h-2 w-2 shrink-0 rounded-full ${visible ? 'bg-violet-400' : 'bg-slate-500'}`}
      />
      {label}
    </button>
  )
}

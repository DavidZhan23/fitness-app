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
      className={`community-visibility-toggle disabled:opacity-50 ${
        visible
          ? 'community-visibility-toggle--on'
          : 'community-visibility-toggle--off'
      }`}
      aria-pressed={visible}
      aria-label={visible ? '今日已公开，点击隐藏' : '今日已隐藏，点击公开'}
    >
      <span aria-hidden className="community-visibility-toggle__dot" />
      {label}
    </button>
  )
}

import type { AppStyle } from '../context/StyleContext'

interface HeroCollabSwitchProps {
  styleId: AppStyle
  enabled: boolean
  label: string
  onChange: (next: boolean) => void
}

export function HeroCollabSwitch({
  styleId,
  enabled,
  label,
  onChange,
}: HeroCollabSwitchProps) {
  const stateLabel = enabled ? 'ON' : 'OFF'

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={`${label}：${enabled ? '已开启' : '已关闭'}`}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onChange(!enabled)
      }}
      className={`hero-collab-switch hero-collab-switch--${styleId} inline-flex h-3.5 shrink-0 items-center rounded-full px-1.5 py-0 ring-1 ring-white/15 transition-colors ${
        enabled ? 'hero-collab-switch--on' : 'hero-collab-switch--off'
      }`}
    >
      <span className="text-[0.4375rem] font-medium leading-none tracking-tight">
        {stateLabel}
      </span>
    </button>
  )
}

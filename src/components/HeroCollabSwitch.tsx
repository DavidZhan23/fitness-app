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

  const toggle = () => onChange(!enabled)

  return (
    <span
      role="switch"
      tabIndex={0}
      aria-checked={enabled}
      aria-label={`${label}：${enabled ? '已开启' : '已关闭'}`}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        toggle()
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        event.stopPropagation()
        toggle()
      }}
      className={`hero-collab-switch hero-collab-switch--${styleId} inline-flex h-3.5 shrink-0 cursor-pointer items-center rounded-full px-1.5 py-0 ring-1 ring-white/15 transition-colors ${
        enabled ? 'hero-collab-switch--on' : 'hero-collab-switch--off'
      }`}
    >
      <span className="text-[0.4375rem] font-medium leading-none tracking-tight">
        {stateLabel}
      </span>
    </span>
  )
}

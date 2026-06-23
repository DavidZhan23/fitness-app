import type { FoxTrigger } from './foxTypes'

const actions: Array<{ label: string; trigger: FoxTrigger }> = [
  { label: '鼓励我一下', trigger: 'fox_long_press_encourage' },
  { label: '今天怎么练', trigger: 'fox_long_press_workout_advice' },
  { label: '看看本周表现', trigger: 'fox_long_press_weekly_summary' },
]

export function FoxInteractionMenu({ onSelect }: { onSelect: (trigger: FoxTrigger) => void }) {
  return (
    <div className="fox-interaction-menu" role="menu" aria-label="小狸互动">
      {actions.map((action) => (
        <button key={action.trigger} type="button" role="menuitem" onClick={() => onSelect(action.trigger)}>
          {action.label}
        </button>
      ))}
    </div>
  )
}

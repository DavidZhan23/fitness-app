import { ReactionThumbsUpIcon } from './reactionIcons'

interface LikeHeartButtonProps {
  active: boolean
  count?: number
  disabled?: boolean
  size?: 'sm' | 'md'
  layout?: 'column' | 'inline'
  className?: string
  onClick: () => void
  'aria-label'?: string
}

export function LikeHeartButton({
  active,
  count = 0,
  disabled = false,
  size = 'md',
  layout = 'column',
  className = '',
  onClick,
  'aria-label': ariaLabel,
}: LikeHeartButtonProps) {
  const label = ariaLabel ?? (active ? '取消赞' : '赞')

  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onClick()
      }}
      className={`like-heart ${active ? 'like-heart--active' : ''} like-heart--${size} like-heart--${layout} ${className}`.trim()}
    >
      <ReactionThumbsUpIcon filled={active} className="like-heart__icon" />
      {count > 0 && (
        <span className="like-heart__count tabular-nums">{count}</span>
      )}
    </button>
  )
}

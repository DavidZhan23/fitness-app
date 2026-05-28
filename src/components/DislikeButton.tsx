import { ReactionThumbsDownIcon } from './reactionIcons'

interface DislikeButtonProps {
  active: boolean
  count?: number
  disabled?: boolean
  size?: 'sm' | 'md'
  layout?: 'column' | 'inline'
  className?: string
  onClick: () => void
  'aria-label'?: string
}

export function DislikeButton({
  active,
  count = 0,
  disabled = false,
  size = 'md',
  layout = 'column',
  className = '',
  onClick,
  'aria-label': ariaLabel,
}: DislikeButtonProps) {
  const label = ariaLabel ?? (active ? '取消踩' : '踩')

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
      className={[
        'like-heart',
        'like-heart--dislike',
        active ? 'like-heart--dislike-active' : '',
        `like-heart--${size}`,
        `like-heart--${layout}`,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <ReactionThumbsDownIcon filled={active} className="like-heart__icon" />
      {count > 0 && (
        <span className="like-heart__count tabular-nums">{count}</span>
      )}
    </button>
  )
}

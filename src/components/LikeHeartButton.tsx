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

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1.25rem"
      height="1.25rem"
      aria-hidden
      className="like-heart__icon"
    >
      {filled ? (
        <path
          d="M12 21s-6.7-4.35-9.2-7.9C.9 10.2 2.2 6.5 6 5.4c2-.6 4.1.2 6 2.1 1.9-1.9 4-2.7 6-2.1 3.8 1.1 5.1 4.8 3.2 7.7C18.7 16.65 12 21 12 21z"
          fill="currentColor"
        />
      ) : (
        <path
          d="M12 20.5s-6.2-4-8.5-7.4C1.8 10.2 3 6.8 6.4 5.8c1.8-.5 3.7.2 5.6 2 1.9-1.8 3.8-2.5 5.6-2 3.4 1 4.6 4.4 2.9 7.3C18.2 16.5 12 20.5 12 20.5z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />
      )}
    </svg>
  )
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
  const label =
    ariaLabel ?? (active ? '取消赞' : '赞')

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
      <HeartIcon filled={active} />
      {count > 0 && (
        <span className="like-heart__count tabular-nums">{count}</span>
      )}
    </button>
  )
}

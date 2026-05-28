function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1.125rem" height="1.125rem" fill="none" aria-hidden>
      <path
        d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0 0-3L16.5 4.5a2.1 2.1 0 0 0-3 0L3 15v5z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 6.5l4 4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1.125rem" height="1.125rem" fill="none" aria-hidden>
      <path
        d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 12a1 1 0 0 0 1 .9h8a1 1 0 0 0 1-.9l1-12"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 11v5M14 11v5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

const iconBtnBase =
  'action-icon-btn inline-flex shrink-0 items-center justify-center rounded-lg p-1.5 transition disabled:opacity-50'

export function RecordEditButton({
  onClick,
  disabled,
  className = '',
}: {
  onClick: () => void
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="修改"
      title="修改"
      className={`${iconBtnBase} action-icon-btn--edit ${className}`.trim()}
    >
      <PencilIcon />
    </button>
  )
}

export function RecordDeleteButton({
  onClick,
  disabled,
  className = '',
}: {
  onClick: () => void
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="删除"
      title="删除"
      className={`${iconBtnBase} action-icon-btn--delete ${className}`.trim()}
    >
      <TrashIcon />
    </button>
  )
}

/** Lucide 风格线框图标，赞/踩共用描边粗细 */
const STROKE_WIDTH = 1.75

const strokeProps = {
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: STROKE_WIDTH,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

interface ReactionIconProps {
  filled?: boolean
  className?: string
}

export function ReactionHeartIcon({ filled = false, className }: ReactionIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1.25rem"
      height="1.25rem"
      aria-hidden
      className={className}
    >
      {filled ? (
        <path
          d="M12 21s-6.7-4.35-9.2-7.9C.9 10.2 2.2 6.5 6 5.4c2-.6 4.1.2 6 2.1 1.9-1.9 4-2.7 6-2.1 3.8 1.1 5.1 4.8 3.2 7.7C18.7 16.65 12 21 12 21z"
          fill="currentColor"
        />
      ) : (
        <path
          d="M12 20.5s-6.2-4-8.5-7.4C1.8 10.2 3 6.8 6.4 5.8c1.8-.5 3.7.2 5.6 2 1.9-1.8 3.8-2.5 5.6-2 3.4 1 4.6 4.4 2.9 7.3C18.2 16.5 12 20.5 12 20.5z"
          {...strokeProps}
        />
      )}
    </svg>
  )
}

/** Lucide thumbs-down */
export function ReactionThumbsDownIcon({
  filled = false,
  className,
}: ReactionIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1.25rem"
      height="1.25rem"
      aria-hidden
      className={className}
    >
      <path d="M17 14V2" {...strokeProps} />
      <path
        d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Lucide thumbs-up */
export function ReactionThumbsUpIcon({
  filled = false,
  className,
}: ReactionIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1.25rem"
      height="1.25rem"
      aria-hidden
      className={className}
    >
      <path d="M7 10V22" {...strokeProps} />
      <path
        d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

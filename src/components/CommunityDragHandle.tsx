interface CommunityDragHandleProps {
  onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => void
  disabled?: boolean
}

function GripIcon() {
  return (
    <svg
      width="16"
      height="20"
      viewBox="0 0 16 20"
      fill="currentColor"
      aria-hidden
      className="opacity-70"
    >
      <circle cx="5" cy="4" r="1.5" />
      <circle cx="11" cy="4" r="1.5" />
      <circle cx="5" cy="10" r="1.5" />
      <circle cx="11" cy="10" r="1.5" />
      <circle cx="5" cy="16" r="1.5" />
      <circle cx="11" cy="16" r="1.5" />
    </svg>
  )
}

/** 与拖动手柄同宽同色的左栏，用于置顶「我」的对齐占位 */
export const communityDragColumnClass = 'community-drag-handle'

export function CommunityDragHandlePlaceholder() {
  return <div className={`${communityDragColumnClass} opacity-0`} aria-hidden />
}

export function CommunityDragHandle({
  onPointerDown,
  disabled,
}: CommunityDragHandleProps) {
  return (
    <button
      type="button"
      aria-label="拖动排序"
      disabled={disabled}
      onPointerDown={onPointerDown}
      className={`${communityDragColumnClass} disabled:opacity-40`}
      style={{ touchAction: 'none' }}
    >
      <GripIcon />
    </button>
  )
}

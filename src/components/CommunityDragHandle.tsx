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
      className="flex w-9 shrink-0 touch-none select-none items-center justify-center self-stretch rounded-l-2xl bg-slate-800/70 text-slate-400 ring-1 ring-slate-700/60 transition hover:bg-slate-700/80 hover:text-slate-300 active:cursor-grabbing active:bg-violet-900/40 active:text-violet-300 disabled:opacity-40"
      style={{ touchAction: 'none' }}
    >
      <GripIcon />
    </button>
  )
}

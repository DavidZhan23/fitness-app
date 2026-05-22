interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = '确定删除',
  cancelLabel = '取消',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        aria-label="关闭"
        onClick={loading ? undefined : onCancel}
      />
      <div className="relative w-full max-w-sm rounded-2xl bg-slate-900 px-5 py-5 shadow-xl ring-1 ring-slate-600/80">
        <h2
          id="confirm-dialog-title"
          className="text-lg font-semibold text-slate-100"
        >
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-300/90">
          {message}
        </p>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="flex-1 rounded-xl bg-slate-800 py-2.5 text-sm font-medium text-slate-200 ring-1 ring-slate-600 transition hover:bg-slate-700 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-red-600/90 py-2.5 text-sm font-medium text-white transition hover:bg-red-500 disabled:opacity-50"
          >
            {loading ? '删除中…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

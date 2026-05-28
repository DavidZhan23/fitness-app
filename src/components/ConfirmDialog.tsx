import { createPortal } from 'react-dom'

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

  return createPortal(
    <div
      className="confirm-dialog fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <button
        type="button"
        className="confirm-dialog__backdrop absolute inset-0"
        aria-label="关闭"
        onClick={loading ? undefined : onCancel}
      />
      <div className="confirm-dialog__panel relative w-full max-w-sm px-5 py-5">
        <h2 id="confirm-dialog-title" className="confirm-dialog__title text-lg">
          {title}
        </h2>
        <p className="confirm-dialog__message mt-2 text-sm leading-relaxed">
          {message}
        </p>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="confirm-dialog__cancel flex-1 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="confirm-dialog__confirm flex-1 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {loading ? '删除中…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

import { useEffect } from 'react'
import { createPortal } from 'react-dom'

interface CalculationExplanationSheetProps {
  open: boolean
  onClose: () => void
}

const TERM_DEFINITIONS = [
  {
    term: '基础消耗',
    definition: '身体一天自然消耗的热量，系统会根据你的身体资料估算。',
  },
  {
    term: '运动消耗',
    definition: '你今天记录的运动，会增加消耗。',
  },
  {
    term: '饮食摄入',
    definition: '你今天记录的饮食，会增加摄入，并减少热量缺口。',
  },
  {
    term: '缺口 / 盈余',
    definition: '消耗大于摄入，就是热量缺口；摄入大于消耗，就是热量盈余。',
  },
] as const

export function CalculationExplanationSheet({
  open,
  onClose,
}: CalculationExplanationSheetProps) {
  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="calc-explanation-sheet fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="calc-explanation-sheet-title"
    >
      <button
        type="button"
        className="calc-explanation-sheet__backdrop absolute inset-0"
        aria-label="关闭"
        onClick={onClose}
      />
      <div className="calc-explanation-sheet__panel relative w-full max-w-sm min-w-0 px-5 py-5">
        <h2
          id="calc-explanation-sheet-title"
          className="calc-explanation-sheet__title text-lg font-semibold"
        >
          热量缺口怎么算？
        </h2>

        <div className="calc-explanation-sheet__body mt-4">
          <div className="calc-explanation-sheet__formula-card">
            <p className="calc-explanation-sheet__formula-main">
              热量缺口 = 消耗 - 摄入
            </p>
            <p className="calc-explanation-sheet__formula-sub">
              也就是：基础消耗 + 运动消耗 - 饮食摄入
            </p>
          </div>

          <dl className="calc-explanation-sheet__terms">
            {TERM_DEFINITIONS.map(({ term, definition }) => (
              <div key={term} className="calc-explanation-sheet__term">
                <dt className="calc-explanation-sheet__term-label">{term}</dt>
                <dd className="calc-explanation-sheet__term-desc">{definition}</dd>
              </div>
            ))}
          </dl>

          <p className="calc-explanation-sheet__tip">
            不用追求单日完全准确，先坚持记录，趋势比单日数字更重要。
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="calc-explanation-sheet__close btn-primary mt-5 w-full rounded-xl py-2.5 text-sm font-medium"
        >
          知道了
        </button>
      </div>
    </div>,
    document.body,
  )
}

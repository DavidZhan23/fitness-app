import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { Profile } from '../types'
import { BmrFormulaPanel } from './MetabolismSummary'

interface BasalMetabolismSheetProps {
  open: boolean
  onClose: () => void
  accumulatedKcal: number
  fullDayBmr: number
  profile: Profile
}

export function BasalMetabolismSheet({
  open,
  onClose,
  accumulatedKcal,
  fullDayBmr,
  profile,
}: BasalMetabolismSheetProps) {
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

  const accumulated = Math.round(accumulatedKcal)
  const fullDay = Math.round(fullDayBmr)
  const timeSpread = profile.metabolism_mode === 'time_spread'

  return createPortal(
    <div
      className="basal-metabolism-sheet fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="basal-metabolism-sheet-title"
    >
      <button
        type="button"
        className="basal-metabolism-sheet__backdrop absolute inset-0"
        aria-label="关闭"
        onClick={onClose}
      />
      <div className="basal-metabolism-sheet__panel relative w-full max-w-sm min-w-0 px-5 py-5">
        <h2 id="basal-metabolism-sheet-title" className="sr-only">
          基础消耗说明
        </h2>

        <BmrFormulaPanel
          profile={profile}
          className="basal-metabolism-sheet__bmr"
          headerClassName="px-4 py-3"
          formulaPanelClassName="px-4 py-3"
          betweenHeaderAndFormula={
            <div className="basal-metabolism-sheet__current px-4 pb-3">
              <p className="basal-metabolism-sheet__current-label">当前基础消耗</p>
              <p className="basal-metabolism-sheet__current-value tabular-nums">
                {accumulated} / {fullDay}
              </p>
              <p className="basal-metabolism-sheet__growth-tip">
                {timeSpread ? '随时间自然增长' : '全天额度已计入'}
              </p>
            </div>
          }
        />

        <button
          type="button"
          onClick={onClose}
          className="basal-metabolism-sheet__close btn-primary mt-5 w-full rounded-xl py-2.5 text-sm font-medium"
        >
          知道了
        </button>
      </div>
    </div>,
    document.body,
  )
}

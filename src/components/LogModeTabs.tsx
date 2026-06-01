import type { ReactNode } from 'react'

export type LogPageMode = 'templates' | 'ai'

interface LogModePanelProps {
  mode: LogPageMode
  children: ReactNode
}

export function LogModePanel({ mode, children }: LogModePanelProps) {
  return (
    <div
      className={`log-mode-panel${mode === 'templates' ? ' log-mode-panel--templates' : ' log-mode-panel--ai'}`}
    >
      {children}
    </div>
  )
}

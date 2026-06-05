import type { ReactNode } from 'react'

export type LogPageMode = 'templates' | 'ai' | 'manual'

interface LogModePanelProps {
  mode: LogPageMode
  children: ReactNode
}

export function LogModePanel({ mode, children }: LogModePanelProps) {
  const modeClass =
    mode === 'templates' ? 'log-mode-panel--templates' : 'log-mode-panel--ai'

  return (
    <div
      className={`log-mode-panel ${modeClass}`}
    >
      {children}
    </div>
  )
}

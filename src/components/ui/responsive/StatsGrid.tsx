import type { ElementType, ReactNode } from 'react'
import { joinClasses } from './utils'

export type StatsGridColumns = 2 | 3

interface StatsGridProps {
  as?: ElementType
  columns?: StatsGridColumns
  className?: string
  children: ReactNode
}

export function StatsGrid({
  as: Component = 'div',
  columns = 3,
  className,
  children,
}: StatsGridProps) {
  return (
    <Component
      className={joinClasses(
        columns === 2 ? 'responsive-grid-2' : 'responsive-grid-3',
        className,
      )}
    >
      {children}
    </Component>
  )
}

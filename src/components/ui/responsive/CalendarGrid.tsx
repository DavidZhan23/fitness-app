import type { ElementType, ReactNode } from 'react'
import { joinClasses } from './utils'

export type CalendarGridDensity = 'default' | 'compact'

interface CalendarGridProps {
  as?: ElementType
  density?: CalendarGridDensity
  className?: string
  children: ReactNode
}

export function CalendarGrid({
  as: Component = 'div',
  density = 'default',
  className,
  children,
}: CalendarGridProps) {
  return (
    <Component
      className={joinClasses(
        'responsive-calendar-grid',
        density === 'compact' && 'responsive-calendar-grid--compact',
        className,
      )}
    >
      {children}
    </Component>
  )
}

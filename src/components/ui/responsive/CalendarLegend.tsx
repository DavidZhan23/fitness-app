import type { ElementType, ReactNode } from 'react'
import { joinClasses } from './utils'

interface CalendarLegendProps {
  as?: ElementType
  className?: string
  children: ReactNode
}

export function CalendarLegend({
  as: Component = 'div',
  className,
  children,
}: CalendarLegendProps) {
  return (
    <Component className={joinClasses('responsive-calendar-legend', className)}>
      {children}
    </Component>
  )
}

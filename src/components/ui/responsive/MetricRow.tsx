import type { ElementType, ReactNode } from 'react'
import { joinClasses } from './utils'

interface MetricRowProps {
  as?: ElementType
  className?: string
  children: ReactNode
}

export function MetricRow({
  as: Component = 'div',
  className,
  children,
}: MetricRowProps) {
  return (
    <Component className={joinClasses('responsive-row', className)}>
      {children}
    </Component>
  )
}

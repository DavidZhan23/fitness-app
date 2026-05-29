import type { ElementType, ReactNode } from 'react'
import { joinClasses } from './utils'

interface ChipWrapProps {
  as?: ElementType
  className?: string
  children: ReactNode
}

export function ChipWrap({
  as: Component = 'div',
  className,
  children,
}: ChipWrapProps) {
  return (
    <Component className={joinClasses('responsive-chip-wrap', className)}>
      {children}
    </Component>
  )
}

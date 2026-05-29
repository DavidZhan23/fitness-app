import type { CSSProperties, ElementType, HTMLAttributes, ReactNode } from 'react'
import { joinClasses } from './utils'

interface SegmentedControlProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType
  columns: number
  className?: string
  style?: CSSProperties
  children: ReactNode
}

export function SegmentedControl({
  as: Component = 'div',
  columns,
  className,
  style,
  children,
  ...rest
}: SegmentedControlProps) {
  return (
    <Component
      className={joinClasses('responsive-segmented', className)}
      style={
        {
          ...style,
          '--responsive-segmented-columns': columns,
        } as CSSProperties
      }
      {...rest}
    >
      {children}
    </Component>
  )
}

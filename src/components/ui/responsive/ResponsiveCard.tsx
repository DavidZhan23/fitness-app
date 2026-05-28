import type { ElementType, ReactNode } from 'react'
import { joinClasses } from './utils'

interface ResponsiveCardProps {
  as?: ElementType
  className?: string
  children: ReactNode
}

export function ResponsiveCard({
  as: Component = 'section',
  className,
  children,
}: ResponsiveCardProps) {
  return (
    <Component className={joinClasses('responsive-card', className)}>
      {children}
    </Component>
  )
}

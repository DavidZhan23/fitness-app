import type { ElementType, ReactNode } from 'react'
import { joinClasses } from './utils'

interface ResponsiveListCardProps {
  as?: ElementType
  className?: string
  children: ReactNode
}

export function ResponsiveListCard({
  as: Component = 'article',
  className,
  children,
}: ResponsiveListCardProps) {
  return (
    <Component className={joinClasses('responsive-list-card', className)}>
      {children}
    </Component>
  )
}

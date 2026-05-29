import type { ElementType, ReactNode } from 'react'
import { joinClasses } from './utils'

interface ActionRowProps {
  as?: ElementType
  className?: string
  children: ReactNode
}

export function ActionRow({
  as: Component = 'div',
  className,
  children,
}: ActionRowProps) {
  return (
    <Component className={joinClasses('responsive-action-row', className)}>
      {children}
    </Component>
  )
}

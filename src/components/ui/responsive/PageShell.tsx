import type { ElementType, ReactNode } from 'react'
import { joinClasses } from './utils'

export type PageShellVariant = 'default' | 'standalone' | 'flush'

interface PageShellProps {
  as?: ElementType
  variant?: PageShellVariant
  className?: string
  children: ReactNode
}

export function PageShell({
  as: Component = 'div',
  variant = 'default',
  className,
  children,
}: PageShellProps) {
  return (
    <Component
      className={joinClasses(
        'responsive-page-shell',
        variant === 'standalone' && 'responsive-page-shell--standalone',
        variant === 'flush' && 'responsive-page-shell--flush',
        className,
      )}
    >
      {children}
    </Component>
  )
}

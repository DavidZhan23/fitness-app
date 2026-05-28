import type { ElementType, ReactNode } from 'react'
import { joinClasses } from './utils'

export type FluidTextVariant = 'title' | 'metric' | 'body'

const VARIANT_CLASS: Record<FluidTextVariant, string> = {
  title: 'responsive-fluid-title',
  metric: 'responsive-fluid-metric',
  body: 'responsive-text',
}

interface FluidTextProps {
  as?: ElementType
  variant?: FluidTextVariant
  className?: string
  children: ReactNode
}

export function FluidText({
  as: Component = 'p',
  variant = 'body',
  className,
  children,
}: FluidTextProps) {
  return (
    <Component
      className={joinClasses(VARIANT_CLASS[variant], className)}
    >
      {children}
    </Component>
  )
}

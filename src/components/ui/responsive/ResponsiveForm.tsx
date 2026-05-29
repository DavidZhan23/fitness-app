import type { FormHTMLAttributes, ReactNode } from 'react'
import { joinClasses } from './utils'

interface ResponsiveFormProps extends FormHTMLAttributes<HTMLFormElement> {
  children: ReactNode
}

export function ResponsiveForm({
  className,
  children,
  ...props
}: ResponsiveFormProps) {
  return (
    <form className={joinClasses('responsive-form', className)} {...props}>
      {children}
    </form>
  )
}

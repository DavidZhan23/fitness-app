import {
  METABOLISM_MODE_ICON,
  METABOLISM_MODE_LABEL,
  normalizeMetabolismMode,
} from '../lib/metabolism'
import type { MetabolismMode } from '../types'

interface MetabolismModeBadgeProps {
  mode: MetabolismMode | null | undefined
  /** avatar：头像右下角角标；inline：行内小图标 */
  variant?: 'avatar' | 'inline'
  className?: string
}

export function MetabolismModeBadge({
  mode,
  variant = 'avatar',
  className = '',
}: MetabolismModeBadgeProps) {
  const resolved = normalizeMetabolismMode(mode)
  const label = METABOLISM_MODE_LABEL[resolved]
  const icon = METABOLISM_MODE_ICON[resolved]

  return (
    <span
      className={`metabolism-mode-badge metabolism-mode-badge--${resolved} metabolism-mode-badge--${variant}${className ? ` ${className}` : ''}`}
      title={label}
      aria-label={label}
      role="img"
    >
      <span aria-hidden>{icon}</span>
    </span>
  )
}

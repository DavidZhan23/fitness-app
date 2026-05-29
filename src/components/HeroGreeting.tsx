import type { CSSProperties } from 'react'
import type { AppStyle } from '../context/StyleContext'
import { FluidText } from './ui/responsive'
import { shouldAllowHeroGreetingWrap } from '../lib/heroGreetingWrap'
import { getHeroGreetingConfig } from '../lib/themeMeta'

const NAME_PLACEHOLDER = '{name}'

interface HeroGreetingProps {
  name: string
  themeStyle: AppStyle
  customWelcomeMessage?: string | null
}

function splitTemplate(template: string) {
  const idx = template.indexOf(NAME_PLACEHOLDER)
  if (idx === -1) return null
  return {
    before: template.slice(0, idx),
    after: template.slice(idx + NAME_PLACEHOLDER.length),
  }
}

export function HeroGreeting({
  name,
  themeStyle,
  customWelcomeMessage,
}: HeroGreetingProps) {
  const config = getHeroGreetingConfig(themeStyle)
  const customTitle =
    typeof customWelcomeMessage === 'string' ? customWelcomeMessage.trim() : ''
  const title = customTitle || config.titleTemplate
  const templateParts = customTitle ? null : splitTemplate(title)
  const subtitleParts = splitTemplate(config.subtitle)
  const allowWrap = shouldAllowHeroGreetingWrap({ customTitle, title })

  const vars = {
    '--hero-greeting-font-family': config.fontFamily,
    '--hero-greeting-title-size': config.titleSize,
    '--hero-greeting-font-weight': config.fontWeight,
    '--hero-greeting-line-height': config.lineHeight,
    '--hero-greeting-letter-spacing': config.letterSpacing,
    '--hero-greeting-title-color': config.titleColor,
    '--hero-greeting-name-color': config.nameColor,
    '--hero-greeting-subtitle-color': config.subtitleColor,
    '--hero-greeting-background': config.background,
    '--hero-greeting-text-shadow': config.textShadow,
  } as CSSProperties

  return (
    <header
      className={`hero-greeting responsive-compact-y hero-greeting--${config.layout} ${allowWrap ? 'hero-greeting--allow-wrap' : ''}`}
      style={vars}
      aria-label="今日欢迎语"
    >
      <FluidText as="h1" variant="title" className="hero-greeting__title">
        {templateParts ? (
          <>
            {templateParts.before && (
              <span className="hero-greeting__line">{templateParts.before}</span>
            )}
            <span className="hero-greeting__name">{name}</span>
            {templateParts.after && (
              <span className="hero-greeting__line">{templateParts.after}</span>
            )}
          </>
        ) : (
          <span className="hero-greeting__line">{title}</span>
        )}
      </FluidText>
      <FluidText as="p" variant="body" className="hero-greeting__subtitle">
        {subtitleParts ? (
          <>
            {subtitleParts.before}
            <span className="hero-greeting__name">{name}</span>
            {subtitleParts.after}
          </>
        ) : (
          config.subtitle
        )}
      </FluidText>
    </header>
  )
}

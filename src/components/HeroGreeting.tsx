import type { CSSProperties } from 'react'
import type { AppStyle } from '../context/StyleContext'
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
  const titleLength = Array.from(title).length
  const nameLength = Array.from(name.trim()).length
  const allowWrap = nameLength >= 10 || titleLength >= 18

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
      className={`hero-greeting hero-greeting--${config.layout} ${allowWrap ? 'hero-greeting--allow-wrap' : ''}`}
      style={vars}
      aria-label="今日欢迎语"
    >
      <h1 className="hero-greeting__title">
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
      </h1>
      <p className="hero-greeting__subtitle">{config.subtitle}</p>
    </header>
  )
}


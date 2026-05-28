import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { getHeroCollabConfig } from '../lib/themeMeta'

export type AppStyle =
  | 'default'
  | 'lavender'
  | 'sakura'
  | 'sakura-blush'
  | 'active-mint'
  | 'eva'
  | 'eva-unit02'
  | 'gundam-hangar'
  | 'jojo-stardust-duel'
  | 'soy-tea'
  | 'wood-zen'

const HERO_COLLAB_STYLES: AppStyle[] = [
  'eva',
  'eva-unit02',
  'gundam-hangar',
  'jojo-stardust-duel',
]

interface StyleContextValue {
  style: AppStyle
  setStyle: (next: AppStyle) => void
  isHeroCollabEnabled: (style: AppStyle) => boolean
  setHeroCollabEnabled: (style: AppStyle, next: boolean) => void
}

const STYLE_COOKIE_KEY = 'fitness_style'
const STYLE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365
const HERO_COLLAB_COOKIE_PREFIX = 'fitness_hero_collab_'

const StyleContext = createContext<StyleContextValue | null>(null)

function normalizeStyle(value: string | null): AppStyle {
  if (value === 'lavender') return 'lavender'
  // 旧 cookie「奶霜马卡龙」迁移到薰衣云梦
  if (value === 'cream') return 'lavender'
  if (value === 'sakura') return 'sakura'
  if (value === 'sakura-blush') return 'sakura-blush'
  // 已下线「雾海潮蓝」，旧 cookie 迁移到碧空樱缀
  if (value === 'aqua') return 'sakura'
  if (value === 'active-mint') return 'active-mint'
  if (value === 'eva') return 'eva'
  if (value === 'eva-unit02') return 'eva-unit02'
  if (value === 'gundam-hangar') return 'gundam-hangar'
  if (value === 'jojo-stardust-duel') return 'jojo-stardust-duel'
  // 已下线「深海能量 2」，旧 cookie 迁移到深海能量
  if (value === 'abyssal-jade') return 'default'
  if (value === 'soy-tea') return 'soy-tea'
  if (value === 'wood-zen') return 'wood-zen'
  // 旧 cookie 'dream' 自动迁移到蓝调主题「碧空樱缀」
  if (value === 'dream') return 'sakura'
  return 'default'
}

function readStyleFromCookie(): AppStyle {
  if (typeof document === 'undefined') return 'default'
  const item = document.cookie
    .split('; ')
    .find((pair) => pair.startsWith(`${STYLE_COOKIE_KEY}=`))
  if (!item) return 'default'
  const raw = item.slice(STYLE_COOKIE_KEY.length + 1)
  return normalizeStyle(decodeURIComponent(raw))
}

function writeStyleCookie(next: AppStyle) {
  if (typeof document === 'undefined') return
  document.cookie = `${STYLE_COOKIE_KEY}=${encodeURIComponent(next)}; Max-Age=${STYLE_COOKIE_MAX_AGE}; Path=/; SameSite=Lax`
}

function heroCollabCookieKey(style: AppStyle) {
  return `${HERO_COLLAB_COOKIE_PREFIX}${style}`
}

function readHeroCollabCookie(style: AppStyle): boolean | null {
  if (typeof document === 'undefined') return null
  const item = document.cookie
    .split('; ')
    .find((pair) => pair.startsWith(`${heroCollabCookieKey(style)}=`))
  if (!item) return null
  const raw = item.slice(heroCollabCookieKey(style).length + 1)
  if (raw === '1') return true
  if (raw === '0') return false
  return null
}

function writeHeroCollabCookie(style: AppStyle, enabled: boolean) {
  if (typeof document === 'undefined') return
  document.cookie = `${heroCollabCookieKey(style)}=${enabled ? '1' : '0'}; Max-Age=${STYLE_COOKIE_MAX_AGE}; Path=/; SameSite=Lax`
}

function resolveHeroCollabEnabled(style: AppStyle): boolean {
  const config = getHeroCollabConfig(style)
  if (!config) return false
  return readHeroCollabCookie(style) ?? config.defaultEnabled
}

function buildHeroCollabByStyle(): Partial<Record<AppStyle, boolean>> {
  const out: Partial<Record<AppStyle, boolean>> = {}
  for (const s of HERO_COLLAB_STYLES) {
    out[s] = resolveHeroCollabEnabled(s)
  }
  return out
}

export function StyleProvider({ children }: { children: ReactNode }) {
  const [style, setStyle] = useState<AppStyle>(() => readStyleFromCookie())
  const [heroCollabByStyle, setHeroCollabByStyle] = useState(buildHeroCollabByStyle)

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.dataset.style = style
    writeStyleCookie(style)
  }, [style])

  useEffect(() => {
    if (typeof document === 'undefined') return
    const config = getHeroCollabConfig(style)
    const enabled = heroCollabByStyle[style] ?? resolveHeroCollabEnabled(style)
    document.documentElement.dataset.heroCollab =
      config && enabled ? 'on' : 'off'
  }, [style, heroCollabByStyle])

  const isHeroCollabEnabled = useCallback(
    (target: AppStyle) =>
      heroCollabByStyle[target] ?? resolveHeroCollabEnabled(target),
    [heroCollabByStyle],
  )

  const setHeroCollabEnabled = useCallback((target: AppStyle, next: boolean) => {
    setHeroCollabByStyle((prev) => ({ ...prev, [target]: next }))
    writeHeroCollabCookie(target, next)
  }, [])

  const value = useMemo(
    () => ({
      style,
      setStyle,
      isHeroCollabEnabled,
      setHeroCollabEnabled,
    }),
    [style, isHeroCollabEnabled, setHeroCollabEnabled],
  )

  return <StyleContext.Provider value={value}>{children}</StyleContext.Provider>
}

export function useAppStyle() {
  const ctx = useContext(StyleContext)
  if (!ctx) throw new Error('useAppStyle must be used within StyleProvider')
  return ctx
}

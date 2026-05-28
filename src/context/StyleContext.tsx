import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type AppStyle =
  | 'default'
  | 'abyssal-jade'
  | 'lavender'
  | 'sakura'
  | 'sakura-blush'
  | 'active-mint'
  | 'eva'
  | 'eva-unit02'
  | 'gundam-hangar'
  | 'soy-tea'
  | 'wood-zen'

interface StyleContextValue {
  style: AppStyle
  setStyle: (next: AppStyle) => void
}

const STYLE_COOKIE_KEY = 'fitness_style'
const STYLE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

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
  if (value === 'abyssal-jade') return 'abyssal-jade'
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

export function StyleProvider({ children }: { children: ReactNode }) {
  const [style, setStyle] = useState<AppStyle>(() => readStyleFromCookie())

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.dataset.style = style
    writeStyleCookie(style)
  }, [style])

  const value = useMemo(
    () => ({
      style,
      setStyle,
    }),
    [style],
  )

  return <StyleContext.Provider value={value}>{children}</StyleContext.Provider>
}

export function useAppStyle() {
  const ctx = useContext(StyleContext)
  if (!ctx) throw new Error('useAppStyle must be used within StyleProvider')
  return ctx
}

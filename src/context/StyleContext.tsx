import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type AppStyle = 'default' | 'cream' | 'sakura' | 'aqua'

interface StyleContextValue {
  style: AppStyle
  setStyle: (next: AppStyle) => void
}

const STYLE_COOKIE_KEY = 'fitness_style'
const STYLE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

const StyleContext = createContext<StyleContextValue | null>(null)

function normalizeStyle(value: string | null): AppStyle {
  if (value === 'cream') return 'cream'
  if (value === 'sakura') return 'sakura'
  if (value === 'aqua') return 'aqua'
  // 旧 cookie 'dream' 自动迁移到粉主题「樱海粉梦」
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

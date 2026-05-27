import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type AppStyle = 'default' | 'dream'

interface StyleContextValue {
  style: AppStyle
  setStyle: (next: AppStyle) => void
}

const STYLE_COOKIE_KEY = 'fitness_style'
const STYLE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

const StyleContext = createContext<StyleContextValue | null>(null)

function normalizeStyle(value: string | null): AppStyle {
  return value === 'dream' ? 'dream' : 'default'
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

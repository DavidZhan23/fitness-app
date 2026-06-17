import { Link, useLocation } from 'react-router-dom'

const LINKS = [
  { to: '/dev', label: '质量周报', end: true },
  { to: '/dev/community', label: '社区名片', end: false },
] as const

export function DeveloperDevNav() {
  const location = useLocation()

  return (
    <nav
      className="developer-dev-nav"
      aria-label="开发者后台导航"
    >
      {LINKS.map(({ to, label, end }) => {
        const active = end
          ? location.pathname === to
          : location.pathname.startsWith(to)
        return (
          <Link
            key={to}
            to={to}
            className={`developer-dev-nav__link${active ? ' developer-dev-nav__link--active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

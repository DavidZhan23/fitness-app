import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useCommunityInbox } from '../hooks/useCommunityInbox'

const navItems = [
  { to: '/', label: '今日', icon: '◉' },
  { to: '/calendar', label: '打卡', icon: '▦' },
  { to: '/community', label: '社区', icon: '◎', notify: true },
  { to: '/settings', label: '设置', icon: '⚙' },
]

export function Layout() {
  const location = useLocation()
  const { unreadCount } = useCommunityInbox()

  return (
    <div className="app-shell">
      <main className="app-main">
        <div className="app-main__inner">
          <Outlet />
          <div className="app-main__tabbar-pad" aria-hidden />
        </div>
      </main>

      <nav className="app-tabbar" aria-label="主导航">
        <div className="app-tabbar__row">
          {navItems.map((item) => {
            const active =
              item.to === '/community'
                ? location.pathname.startsWith('/community')
                : item.to === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.to)
            const showDot =
              item.notify && unreadCount > 0 && !active
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={() =>
                  `app-tabbar__link${active ? ' app-tabbar__link--active' : ''}${showDot ? ' app-tabbar__link--notify' : ''}`
                }
              >
                <span className="app-tabbar__icon-wrap">
                  <span className="app-tabbar__icon" aria-hidden>
                    {item.icon}
                  </span>
                  {showDot && (
                    <span
                      className="app-tabbar__notify-dot"
                      aria-label={`${unreadCount} 条社区新互动`}
                    />
                  )}
                </span>
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

import { NavLink, Outlet } from 'react-router-dom'

const navItems = [
  { to: '/', label: '今日', icon: '◉' },
  { to: '/calendar', label: '打卡', icon: '▦' },
  { to: '/templates', label: '模板', icon: '☰' },
  { to: '/settings', label: '设置', icon: '⚙' },
]

export function Layout() {
  return (
    <div className="app-shell">
      <main className="app-main">
        <div className="app-main__inner">
          <Outlet />
        </div>
      </main>

      <nav className="app-tabbar" aria-label="主导航">
        <div className="app-tabbar__row">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `app-tabbar__link${isActive ? ' app-tabbar__link--active' : ''}`
              }
            >
              <span className="app-tabbar__icon" aria-hidden>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

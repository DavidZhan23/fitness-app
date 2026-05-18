import { NavLink, Outlet } from 'react-router-dom'

const navItems = [
  { to: '/', label: '今日', icon: '◉' },
  { to: '/calendar', label: '打卡', icon: '▦' },
  { to: '/templates', label: '模板', icon: '☰' },
  { to: '/settings', label: '设置', icon: '⚙' },
]

/**
 * 全屏 flex：主内容可滚动，底栏贴在屏幕最底部（含 iPhone 安全区）。
 * 不用 fixed，避免 PWA 里整页上漂、底栏悬空。
 */
export function Layout() {
  return (
    <div className="flex min-h-dvh w-full flex-col">
      <main className="safe-pt min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
        <div className="mx-auto w-full max-w-lg px-4 py-4">
          <Outlet />
        </div>
      </main>

      <nav className="safe-pb shrink-0 border-t border-slate-700/80 bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg justify-around px-2 py-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex min-w-[4rem] flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-xs transition-colors ${
                  isActive
                    ? 'text-brand font-medium'
                    : 'text-muted hover:text-slate-200'
                }`
              }
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

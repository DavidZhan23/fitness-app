import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/** 仅允许 isDeveloper 用户访问子路由 */
export function DeveloperRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="page-standalone flex items-center justify-center">
        <p className="text-muted">加载中…</p>
      </div>
    )
  }

  if (!user?.isDeveloper) {
    return <Navigate to="/settings" replace />
  }

  return <Outlet />
}

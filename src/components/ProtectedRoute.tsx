import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { isBackendConfigured } from '../lib/config'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, profileError, loading, refreshProfile } = useAuth()
  const location = useLocation()

  if (!isBackendConfigured) {
    return <Navigate to="/setup" replace />
  }

  if (loading) {
    return (
      <div className="page-standalone flex items-center justify-center">
        <p className="text-muted">加载中…</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!profile) {
    if (profileError) {
      return (
        <div className="page-standalone flex flex-col items-center justify-center gap-3 px-4 text-center">
          <p className="text-red-400">个人资料加载失败：{profileError}</p>
          <button
            type="button"
            onClick={() => void refreshProfile().catch(() => undefined)}
            className="text-brand underline"
          >
            重试
          </button>
        </div>
      )
    }
    return (
      <div className="page-standalone flex items-center justify-center">
        <p className="text-muted">加载中…</p>
      </div>
    )
  }

  if (!profile.onboarding_complete && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  return <>{children}</>
}

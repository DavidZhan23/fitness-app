import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { isBackendConfigured } from '../lib/config'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  if (!isBackendConfigured) {
    return <Navigate to="/setup" replace />
  }

  if (loading) {
    return (
      <div className="safe-pt safe-pb flex min-h-dvh items-center justify-center">
        <p className="text-muted">加载中…</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (profile && !profile.onboarding_complete && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  return <>{children}</>
}

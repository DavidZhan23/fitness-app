import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { DeveloperRoute } from './components/DeveloperRoute'
import { AuthProvider } from './context/AuthContext'
import { StyleProvider } from './context/StyleContext'
import { TelemetryListener } from './components/TelemetryListener'
import { LoginPage } from './pages/LoginPage'
import { SetupPage } from './pages/SetupPage'
import { TodayPage } from './pages/TodayPage'

const CalendarPage = lazy(() =>
  import('./pages/CalendarPage').then((m) => ({ default: m.CalendarPage })),
)
const LogPage = lazy(() =>
  import('./pages/LogPage.tsx').then((m) => ({ default: m.LogPage })),
)
const OnboardingPage = lazy(() =>
  import('./pages/OnboardingPage').then((m) => ({ default: m.OnboardingPage })),
)
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
)
const TemplatesPage = lazy(() =>
  import('./pages/TemplatesPage').then((m) => ({ default: m.TemplatesPage })),
)
const CommunityPage = lazy(() =>
  import('./pages/CommunityPage').then((m) => ({ default: m.CommunityPage })),
)
const CommunityUserPage = lazy(() =>
  import('./pages/CommunityUserPage').then((m) => ({
    default: m.CommunityUserPage,
  })),
)
const DeveloperReportsPage = lazy(() =>
  import('./pages/DeveloperReportsPage').then((m) => ({
    default: m.DeveloperReportsPage,
  })),
)
const DeveloperReportDetailPage = lazy(() =>
  import('./pages/DeveloperReportDetailPage').then((m) => ({
    default: m.DeveloperReportDetailPage,
  })),
)

function RouteFallback() {
  return (
    <div className="page-standalone flex items-center justify-center">
      <p className="text-muted">加载中…</p>
    </div>
  )
}

export default function App() {
  return (
    <StyleProvider>
      <AuthProvider>
        <BrowserRouter>
          <TelemetryListener />
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/setup" element={<SetupPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/onboarding"
                element={
                  <ProtectedRoute>
                    <OnboardingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<TodayPage />} />
                <Route path="calendar" element={<CalendarPage />} />
                <Route path="community" element={<CommunityPage />} />
                <Route path="community/:userId" element={<CommunityUserPage />} />
                <Route path="templates" element={<TemplatesPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
              <Route
                path="/log/:type"
                element={
                  <ProtectedRoute>
                    <LogPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dev"
                element={
                  <ProtectedRoute>
                    <DeveloperRoute />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DeveloperReportsPage />} />
                <Route path="reports/:week" element={<DeveloperReportDetailPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </StyleProvider>
  )
}

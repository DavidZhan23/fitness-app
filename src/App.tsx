import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import { CalendarPage } from './pages/CalendarPage'
import { LoginPage } from './pages/LoginPage'
import { LogPage } from './pages/LogPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { SettingsPage } from './pages/SettingsPage'
import { SetupPage } from './pages/SetupPage'
import { TemplatesPage } from './pages/TemplatesPage'
import { TodayPage } from './pages/TodayPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

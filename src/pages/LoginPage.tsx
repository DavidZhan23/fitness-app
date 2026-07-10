import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { httpAuth } from '../lib/api'
import { formatAuthError } from '../lib/authErrors'
import { isBackendConfigured } from '../lib/config'

type AuthMode = 'login' | 'register' | 'forgot' | 'reset'

const inputClassName =
  'w-full min-w-0 rounded-xl bg-card px-3 py-2.5 ring-1 ring-slate-600 focus:ring-brand outline-none box-border'

export function LoginPage() {
  const { user, loading: authLoading, signIn, signUp, signOut } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const resetToken = searchParams.get('reset_token') ?? ''
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [registrationKey, setRegistrationKey] = useState('')
  const [mode, setMode] = useState<AuthMode>(resetToken ? 'reset' : 'login')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (resetToken) {
      setMode('reset')
      setError('')
      setMessage('')
    }
  }, [resetToken])

  if (!isBackendConfigured) {
    return <Navigate to="/setup" replace />
  }

  if (authLoading) {
    return (
      <div className="page-standalone flex items-center justify-center">
        <p className="text-muted">加载中…</p>
      </div>
    )
  }

  if (user && !resetToken) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    try {
      if (mode === 'register') {
        await signUp(email, password, registrationKey)
        navigate('/')
        return
      }
      if (mode === 'forgot') {
        const data = await httpAuth.requestPasswordReset(email)
        setMessage(data.message)
        return
      }
      if (mode === 'reset') {
        if (password !== confirmPassword) {
          setError('两次输入的新密码不一致')
          return
        }
        await httpAuth.confirmPasswordReset(resetToken, password)
        await signOut()
        setPassword('')
        setConfirmPassword('')
        setMode('login')
        setSearchParams({})
        setMessage('密码已重置，请使用新密码登录')
        return
      }
      await signIn(email, password)
      navigate('/')
    } catch (err) {
      setError(formatAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode)
    setError('')
    setMessage('')
    setPassword('')
    setConfirmPassword('')
    if (nextMode !== 'register') setRegistrationKey('')
    if (nextMode !== 'reset' && resetToken) setSearchParams({})
  }

  const submitLabel = () => {
    if (loading) return '请稍候…'
    if (mode === 'register') return '注册'
    if (mode === 'forgot') return '发送重置邮件'
    if (mode === 'reset') return '设置新密码'
    return '登录'
  }

  const subtitle = () => {
    if (mode === 'forgot') return '输入注册邮箱，接收一次性重置链接'
    if (mode === 'reset') return '为账号设置一个新的登录密码'
    return '记录运动与饮食，追踪热量缺口'
  }

  const needsEmail = mode !== 'reset'
  const needsPassword = mode !== 'forgot'

  return (
    <div className="page-standalone">
      <div className="auth-shell mx-auto w-full min-w-0 box-border px-4 py-8">
        <h1 className="text-2xl font-bold text-brand">满打满算</h1>
        <p className="mt-1 text-sm text-muted">{subtitle()}</p>

        <form onSubmit={handleSubmit} className="responsive-form mt-8">
          {needsEmail && (
            <Field label="邮箱">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClassName}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </Field>
          )}
          {needsPassword && (
            <Field label={mode === 'reset' ? '新密码' : '密码'}>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClassName}
                placeholder="至少 6 位"
                autoComplete={
                  mode === 'reset' ? 'new-password' : 'current-password'
                }
              />
            </Field>
          )}
          {mode === 'reset' && (
            <Field label="确认新密码">
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClassName}
                placeholder="再次输入新密码"
                autoComplete="new-password"
              />
            </Field>
          )}
          {mode === 'register' && (
            <Field label="注册密钥">
              <input
                type="password"
                required
                value={registrationKey}
                onChange={(e) => setRegistrationKey(e.target.value)}
                className={inputClassName}
                placeholder="请输入邀请密钥"
                autoComplete="off"
              />
            </Field>
          )}

          {error && <p className="text-sm text-amber-400">{error}</p>}
          {message && <p className="text-sm text-emerald-300">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full min-w-0 py-3 font-medium disabled:opacity-50"
          >
            {submitLabel()}
          </button>
        </form>

        <div className="mt-4 space-y-3 text-center text-sm">
          {mode === 'login' && (
            <>
              <button
                type="button"
                onClick={() => switchMode('forgot')}
                className="w-full text-brand"
              >
                忘记密码？
              </button>
              <button
                type="button"
                onClick={() => switchMode('register')}
                className="w-full text-brand"
              >
                没有账号？注册
              </button>
            </>
          )}
          {mode === 'register' && (
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="w-full text-brand"
            >
              已有账号？登录
            </button>
          )}
          {(mode === 'forgot' || mode === 'reset') && (
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="w-full text-brand"
            >
              返回登录
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="block w-full min-w-0">
      <span className="text-sm text-muted">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}

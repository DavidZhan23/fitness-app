import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { formatAuthError } from '../lib/authErrors'
import { isBackendConfigured } from '../lib/config'

export function LoginPage() {
  const { user, signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [registrationKey, setRegistrationKey] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isBackendConfigured) {
    return <Navigate to="/setup" replace />
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isRegister) {
        await signUp(email, password, registrationKey)
        navigate('/')
        return
      } else {
        await signIn(email, password)
        navigate('/')
      }
    } catch (err) {
      setError(formatAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-standalone flex flex-col justify-center">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="text-2xl font-bold text-brand">健身打卡</h1>
        <p className="mt-1 text-sm text-muted">记录运动与饮食，追踪热量缺口</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label className="block">
            <span className="text-sm text-muted">邮箱</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl bg-card px-3 py-2.5 ring-1 ring-slate-600 focus:ring-brand outline-none"
              placeholder="you@example.com"
            />
          </label>
          <label className="block">
            <span className="text-sm text-muted">密码</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl bg-card px-3 py-2.5 ring-1 ring-slate-600 focus:ring-brand outline-none"
              placeholder="至少 6 位"
            />
          </label>
          {isRegister && (
            <label className="block">
              <span className="text-sm text-muted">注册密钥</span>
              <input
                type="password"
                required
                value={registrationKey}
                onChange={(e) => setRegistrationKey(e.target.value)}
                className="mt-1 w-full rounded-xl bg-card px-3 py-2.5 ring-1 ring-slate-600 focus:ring-brand outline-none"
                placeholder="请输入邀请密钥"
                autoComplete="off"
              />
            </label>
          )}

          {error && <p className="text-sm text-amber-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand-dark py-3 font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {loading ? '请稍候…' : isRegister ? '注册' : '登录'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setIsRegister(!isRegister)
            if (isRegister) setRegistrationKey('')
          }}
          className="mt-4 w-full text-center text-sm text-brand"
        >
          {isRegister ? '已有账号？登录' : '没有账号？注册'}
        </button>
      </div>
    </div>
  )
}

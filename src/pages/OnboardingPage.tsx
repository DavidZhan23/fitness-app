import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ACTIVITY_LEVELS } from '../lib/calories'
import type { Sex } from '../types'

export function OnboardingPage() {
  const { profile, completeOnboarding } = useAuth()
  const navigate = useNavigate()
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [age, setAge] = useState('')
  const [sex, setSex] = useState<Sex>('male')
  const [activity, setActivity] = useState(1.375)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (profile?.onboarding_complete) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const w = parseFloat(weight)
    const h = parseFloat(height)
    const a = parseInt(age, 10)
    if (!w || !h || !a) {
      setError('请填写完整信息')
      return
    }
    setLoading(true)
    try {
      await completeOnboarding({
        weight_kg: w,
        height_cm: h,
        age: a,
        sex,
        activity_factor: activity,
      })
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="safe-pt safe-pb min-h-dvh overflow-y-auto">
      <div className="mx-auto max-w-md space-y-6 px-4 py-4">
      <div>
        <h1 className="text-xl font-bold">完善身体资料</h1>
        <p className="mt-1 text-sm text-muted">用于计算基础代谢与每日消耗</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="体重 (kg)">
          <input
            type="number"
            step="0.1"
            required
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="身高 (cm)">
          <input
            type="number"
            required
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="年龄">
          <input
            type="number"
            required
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="性别">
          <select
            value={sex}
            onChange={(e) => setSex(e.target.value as Sex)}
            className="input"
          >
            <option value="male">男</option>
            <option value="female">女</option>
          </select>
        </Field>
        <Field label="活动水平">
          <select
            value={activity}
            onChange={(e) => setActivity(parseFloat(e.target.value))}
            className="input"
          >
            {ACTIVITY_LEVELS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </Field>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-brand-dark py-3 font-medium disabled:opacity-50"
        >
          {loading ? '保存中…' : '开始使用'}
        </button>
      </form>
      </div>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="text-sm text-muted">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}

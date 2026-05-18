import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { MetabolismSummary } from '../components/MetabolismSummary'
import { ACTIVITY_LEVELS } from '../lib/calories'
import type { Sex } from '../types'

export function SettingsPage() {
  const { profile, updateProfile, signOut } = useAuth()
  const navigate = useNavigate()
  const [weight, setWeight] = useState(String(profile?.weight_kg ?? ''))
  const [height, setHeight] = useState(String(profile?.height_cm ?? ''))
  const [age, setAge] = useState(String(profile?.age ?? ''))
  const [sex, setSex] = useState<Sex>(profile?.sex ?? 'male')
  const [activity, setActivity] = useState(
    () => Number(profile?.activity_factor) || 1.375,
  )
  const [threshold, setThreshold] = useState(String(profile?.deficit_threshold ?? 0))
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      const w = parseFloat(weight)
      const h = parseFloat(height)
      const a = parseInt(age, 10)
      if (!w || !h || !a) {
        setMessage('请填写有效的体重、身高和年龄')
        return
      }
      await updateProfile({
        weight_kg: w,
        height_cm: h,
        age: a,
        sex,
        activity_factor: activity,
        deficit_threshold: parseInt(threshold, 10) || 0,
      })
      setMessage('已保存')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '保存失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">设置</h1>

      {profile && <MetabolismSummary profile={profile} />}

      <form onSubmit={handleSave} className="space-y-4">
        <label className="block">
          <span className="text-sm text-muted">体重 (kg)</span>
          <input
            type="number"
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="input mt-1"
          />
        </label>
        <label className="block">
          <span className="text-sm text-muted">身高 (cm)</span>
          <input
            type="number"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            className="input mt-1"
          />
        </label>
        <label className="block">
          <span className="text-sm text-muted">年龄</span>
          <input
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="input mt-1"
          />
        </label>
        <label className="block">
          <span className="text-sm text-muted">性别</span>
          <select
            value={sex}
            onChange={(e) => setSex(e.target.value as Sex)}
            className="input mt-1"
          >
            <option value="male">男</option>
            <option value="female">女</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm text-muted">活动水平</span>
          <select
            value={activity}
            onChange={(e) => setActivity(parseFloat(e.target.value))}
            className="input mt-1"
          >
            {ACTIVITY_LEVELS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm text-muted">缺口打卡阈值 (kcal)</span>
          <input
            type="number"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            className="input mt-1"
          />
          <p className="mt-1 text-xs text-muted">缺口大于此值才算打卡成功，默认 0</p>
        </label>

        {message && (
          <p
            className={`text-sm ${
              message === '已保存' ? 'text-brand' : 'text-amber-400'
            }`}
          >
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-brand-dark py-3 font-medium disabled:opacity-50"
        >
          {loading ? '保存中…' : '保存资料'}
        </button>
      </form>

      <button
        type="button"
        onClick={handleSignOut}
        className="w-full rounded-xl border border-red-500/50 py-3 text-red-400"
      >
        退出登录
      </button>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { InstallGuide } from '../components/InstallGuide'
import { MetabolismSummary } from '../components/MetabolismSummary'
import { UserAvatar } from '../components/UserAvatar'
import { useAuth } from '../context/AuthContext'
import { ACTIVITY_LEVELS } from '../lib/calories'
import {
  ageFromBirthdayKey,
  formatTodayDateKey,
  normalizeBirthdayFromApi,
} from '../lib/birthday'
import type { Sex } from '../types'

export function SettingsPage() {
  const { user, profile, updateProfile, signOut } = useAuth()
  const navigate = useNavigate()
  const [weight, setWeight] = useState(String(profile?.weight_kg ?? ''))
  const [height, setHeight] = useState(String(profile?.height_cm ?? ''))
  const [birthday, setBirthday] = useState(
    () => normalizeBirthdayFromApi(profile?.birthday) ?? '',
  )
  const [sex, setSex] = useState<Sex>(profile?.sex ?? 'male')
  const [activity, setActivity] = useState(
    () => Number(profile?.activity_factor) || 1.375,
  )
  const [nickname, setNickname] = useState(profile?.nickname ?? '')
  const [threshold, setThreshold] = useState(String(profile?.deficit_threshold ?? 0))
  const [nicknameSaveState, setNicknameSaveState] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle')
  const [bodySaveState, setBodySaveState] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle')
  const [bodySaveError, setBodySaveError] = useState('')

  const todayKey = formatTodayDateKey()
  const derivedAge = birthday ? ageFromBirthdayKey(birthday) : null

  useEffect(() => {
    if (!profile) return
    setWeight(String(profile.weight_kg ?? ''))
    setHeight(String(profile.height_cm ?? ''))
    setBirthday(normalizeBirthdayFromApi(profile.birthday) ?? '')
    setSex(profile.sex ?? 'male')
    setActivity(Number(profile.activity_factor) || 1.375)
    setNickname(profile.nickname ?? '')
    setThreshold(String(profile.deficit_threshold ?? 0))
  }, [profile])

  useEffect(() => {
    if (!profile) return
    const trimmed = nickname.trim()
    const saved = (profile.nickname ?? '').trim()
    if (trimmed === saved) {
      setNicknameSaveState('idle')
      return
    }

    setNicknameSaveState('saving')
    const timer = window.setTimeout(() => {
      void updateProfile({ nickname: trimmed || null })
        .then(() => setNicknameSaveState('saved'))
        .catch(() => setNicknameSaveState('error'))
    }, 450)

    return () => clearTimeout(timer)
  }, [nickname, profile?.nickname, profile, updateProfile])

  useEffect(() => {
    if (nicknameSaveState !== 'saved') return
    const fade = window.setTimeout(() => setNicknameSaveState('idle'), 3000)
    return () => clearTimeout(fade)
  }, [nicknameSaveState])

  useEffect(() => {
    if (!profile) return

    const w = parseFloat(weight)
    const h = parseFloat(height)
    const deficit = parseInt(threshold, 10) || 0
    const savedWeight = Number(profile.weight_kg)
    const savedHeight = Number(profile.height_cm)
    const savedDeficit = Number(profile.deficit_threshold ?? 0)
    const savedBirthday = normalizeBirthdayFromApi(profile.birthday) ?? ''
    const savedActivity = Number(profile.activity_factor) || 1.375
    const savedSex = profile.sex ?? 'male'

    const unchanged =
      savedWeight === w &&
      savedHeight === h &&
      savedBirthday === birthday &&
      savedSex === sex &&
      savedActivity === activity &&
      savedDeficit === deficit

    if (unchanged) {
      setBodySaveState('idle')
      setBodySaveError('')
      return
    }

    if (!w || !h) {
      setBodySaveState('idle')
      setBodySaveError('请填写有效的体重和身高')
      return
    }
    if (!birthday) {
      setBodySaveState('idle')
      setBodySaveError('请填写生日')
      return
    }
    const age = ageFromBirthdayKey(birthday)
    if (!age) {
      setBodySaveState('idle')
      setBodySaveError('请填写有效的生日')
      return
    }

    setBodySaveState('saving')
    setBodySaveError('')
    const timer = window.setTimeout(() => {
      void updateProfile({
        weight_kg: w,
        height_cm: h,
        birthday,
        age,
        sex,
        activity_factor: activity,
        deficit_threshold: deficit,
      })
        .then(() => setBodySaveState('saved'))
        .catch((err) => {
          setBodySaveState('error')
          setBodySaveError(err instanceof Error ? err.message : '保存失败')
        })
    }, 450)

    return () => clearTimeout(timer)
  }, [
    weight,
    height,
    birthday,
    sex,
    activity,
    threshold,
    profile,
    updateProfile,
  ])

  useEffect(() => {
    if (bodySaveState !== 'saved') return
    const fade = window.setTimeout(() => setBodySaveState('idle'), 3000)
    return () => clearTimeout(fade)
  }, [bodySaveState])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="space-y-6 pb-12">
      <h1 className="text-xl font-bold">设置</h1>

      {user?.isDeveloper && (
        <Link
          to="/dev"
          className="flex items-center justify-between rounded-xl border border-brand/40 bg-brand/10 px-4 py-3 text-sm font-medium text-brand"
        >
          <span>开发者后台 · 质量周报</span>
          <span aria-hidden>→</span>
        </Link>
      )}

      <section className="rounded-2xl bg-slate-800/80 p-4 ring-1 ring-slate-600/50">
        <h2 className="font-semibold text-slate-100">个人资料</h2>

        <div className="mt-3 flex items-center gap-3">
          <UserAvatar profile={profile} user={user} size="lg" />
          <label className="min-w-0 flex-1">
            <span className="flex items-center justify-between gap-2 text-sm text-muted">
              <span>昵称</span>
              {nicknameSaveState === 'saving' && (
                <span className="text-xs text-muted">保存中…</span>
              )}
              {nicknameSaveState === 'saved' && (
                <span className="text-xs text-brand">已保存</span>
              )}
              {nicknameSaveState === 'error' && (
                <span className="text-xs text-amber-400">保存失败</span>
              )}
            </span>
            <input
              type="text"
              maxLength={32}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="input mt-1"
              placeholder="给自己起个名字，留空则显示邮箱前缀"
            />
          </label>
        </div>

        <details className="group mt-3">
          <summary className="cursor-pointer list-none text-sm text-brand marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="flex items-center justify-between gap-2">
              编辑身体资料
              <span
                className="text-muted transition group-open:rotate-90"
                aria-hidden
              >
                ▸
              </span>
            </span>
          </summary>

          <div className="mt-4 space-y-4 border-t border-slate-600/40 pt-4">
            <div className="flex min-h-5 items-center justify-end gap-2 text-xs">
              {bodySaveState === 'saving' && (
                <span className="text-muted">保存中…</span>
              )}
              {bodySaveState === 'saved' && (
                <span className="text-brand">已保存</span>
              )}
              {bodySaveState === 'error' && (
                <span className="text-amber-400">{bodySaveError || '保存失败'}</span>
              )}
              {bodySaveState === 'idle' && bodySaveError && (
                <span className="text-amber-400">{bodySaveError}</span>
              )}
            </div>
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
              <span className="text-sm text-muted">生日</span>
              <input
                type="date"
                max={todayKey}
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className="input mt-1"
              />
              {derivedAge != null && (
                <p className="mt-1 text-xs text-muted">
                  {birthday}（{derivedAge} 岁）
                </p>
              )}
              {!birthday && profile?.age != null && profile.age > 0 && (
                <p className="mt-1 text-xs text-amber-400/90">
                  当前按年龄 {profile.age} 岁计算 BMR，请填写生日以便长期准确
                </p>
              )}
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
              <p className="mt-1 text-xs text-muted">
                缺口大于此值才算打卡成功，默认 0
              </p>
            </label>

          </div>
        </details>
      </section>

      {profile && <MetabolismSummary profile={profile} />}

      <InstallGuide collapsible />

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

import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { InstallGuide } from '../components/InstallGuide'
import { MetabolismSummary } from '../components/MetabolismSummary'
import { UserAvatar } from '../components/UserAvatar'
import { useAuth } from '../context/AuthContext'
import { useAppStyle, type AppStyle } from '../context/StyleContext'
import { ACTIVITY_LEVELS } from '../lib/calories'
import {
  ageFromBirthdayKey,
  formatTodayDateKey,
  normalizeBirthdayFromApi,
} from '../lib/birthday'
import { useDebouncedAutosave } from '../hooks/useDebouncedAutosave'
import type { Sex, WallStyle } from '../types'

const styleOptions: Array<{
  id: AppStyle
  title: string
  description: string
  swatchClassName: string
  optionClassName: string
}> = [
  {
    id: 'default',
    title: '深海能量',
    description: '偏运动感的深色青绿系',
    swatchClassName: 'style-swatch-ocean',
    optionClassName: 'style-option-ocean',
  },
  {
    id: 'abyssal-jade',
    title: '深海能量 2',
    description: '墨绿深海、翡翠主操、荧光青运动、珊瑚橙饮食',
    swatchClassName: 'style-swatch-abyssal-jade',
    optionClassName: 'style-option-abyssal-jade',
  },
  {
    id: 'lavender',
    title: '薰衣云梦',
    description: '云雾淡紫底、奶白紫卡，薰衣草主操、紫蓝运动、玫瑰紫粉饮食',
    swatchClassName: 'style-swatch-lavender',
    optionClassName: 'style-option-lavender',
  },
  {
    id: 'sakura',
    title: '樱海晴梦',
    description: '奶粉底、白粉卡，运动蓝与饮食粉分工明确',
    swatchClassName: 'style-swatch-sakura',
    optionClassName: 'style-option-sakura',
  },
  {
    id: 'sakura-blush',
    title: '樱粉云境',
    description: '樱花粉底、奶粉卡，运动蓝 / 饮食莓粉',
    swatchClassName: 'style-swatch-sakura-blush',
    optionClassName: 'style-option-sakura-blush',
  },
  {
    id: 'active-mint',
    title: '轻氧薄荷',
    description: '薄荷雾绿底、奶白薄荷卡，蓝管运动、珊瑚橙管饮食、绿管缺口',
    swatchClassName: 'style-swatch-active-mint',
    optionClassName: 'style-option-active-mint',
  },
  {
    id: 'eva',
    title: '暴走初号机',
    description: '深黑紫机甲底 · 荧光绿运动缺口 · 插入栓橙饮食',
    swatchClassName: 'style-swatch-eva',
    optionClassName: 'style-option-eva',
  },
  {
    id: 'eva-unit02',
    title: '烈焰二号机',
    description: '深黑红驾驶舱 · 二号机红主操 · 橙黄饮食 · 荧光绿运动缺口',
    swatchClassName: 'style-swatch-eva-unit02',
    optionClassName: 'style-option-eva-unit02',
  },
  {
    id: 'gundam-hangar',
    title: '格纳库提坦斯',
    description: '暗色提坦斯钢蓝装甲、冷青运动缺口、琥珀饮食摄入，格纳库仪表盘感',
    swatchClassName: 'style-swatch-gundam-hangar',
    optionClassName: 'style-option-gundam-hangar',
  },
]

export function SettingsPage() {
  const { user, profile, updateProfile, signOut } = useAuth()
  const { style, setStyle } = useAppStyle()
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
  const [wallStyle, setWallStyle] = useState<WallStyle>(
    () => (profile?.wall_style === 'split' ? 'split' : 'classic'),
  )

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
    setWallStyle(profile.wall_style === 'split' ? 'split' : 'classic')
  }, [profile])

  const trimmedNickname = nickname.trim()
  const savedNickname = (profile?.nickname ?? '').trim()
  const parsedWeight = parseFloat(weight)
  const parsedHeight = parseFloat(height)
  const parsedDeficit = parseInt(threshold, 10) || 0
  const savedWeight = Number(profile?.weight_kg)
  const savedHeight = Number(profile?.height_cm)
  const savedDeficit = Number(profile?.deficit_threshold ?? 0)
  const savedBirthday = normalizeBirthdayFromApi(profile?.birthday) ?? ''
  const savedActivity = Number(profile?.activity_factor) || 1.375
  const savedSex = profile?.sex ?? 'male'

  const bodyUnchanged = profile
    ? savedWeight === parsedWeight &&
      savedHeight === parsedHeight &&
      savedBirthday === birthday &&
      savedSex === sex &&
      savedActivity === activity &&
      savedDeficit === parsedDeficit
    : true

  const saveNickname = useCallback(async () => {
    await updateProfile({ nickname: trimmedNickname || null })
  }, [updateProfile, trimmedNickname])

  const nicknameAutosave = useDebouncedAutosave({
    enabled: Boolean(profile),
    isEqual: trimmedNickname === savedNickname,
    save: saveNickname,
    mapError: () => '保存失败',
  })
  const nicknameSaveState = nicknameAutosave.state

  const validateBody = useCallback(() => {
    if (!parsedWeight || !parsedHeight) return '请填写有效的体重和身高'
    if (!birthday) return '请填写生日'
    if (!ageFromBirthdayKey(birthday)) return '请填写有效的生日'
    return null
  }, [parsedWeight, parsedHeight, birthday])

  const saveBody = useCallback(async () => {
    if (!profile) return
    const age = ageFromBirthdayKey(birthday)
    if (!age) throw new Error('请填写有效的生日')
    await updateProfile({
      weight_kg: parsedWeight,
      height_cm: parsedHeight,
      birthday,
      age,
      sex,
      activity_factor: activity,
      deficit_threshold: parsedDeficit,
    })
  }, [
    profile,
    birthday,
    sex,
    activity,
    parsedWeight,
    parsedHeight,
    parsedDeficit,
    updateProfile,
  ])

  const bodyAutosave = useDebouncedAutosave({
    enabled: Boolean(profile),
    isEqual: bodyUnchanged,
    validate: validateBody,
    save: saveBody,
    mapError: (err) => (err instanceof Error ? err.message : '保存失败'),
  })
  const bodySaveState = bodyAutosave.state
  const bodySaveError = bodyAutosave.error

  const savedWallStyle: WallStyle =
    profile?.wall_style === 'split' ? 'split' : 'classic'

  const saveWallStyle = useCallback(async () => {
    await updateProfile({ wall_style: wallStyle })
  }, [updateProfile, wallStyle])

  const wallStyleAutosave = useDebouncedAutosave({
    enabled: Boolean(profile),
    isEqual: wallStyle === savedWallStyle,
    save: saveWallStyle,
    mapError: () => '保存失败',
  })
  const wallStyleSaveState = wallStyleAutosave.state

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="space-y-6 pb-12">
      <h1 className="text-xl font-bold text-primary">设置</h1>

      {user?.isDeveloper && (
        <Link
          to="/dev"
          className="flex items-center justify-between rounded-xl border border-brand/40 bg-brand/10 px-4 py-3 text-sm font-medium text-brand"
        >
          <span>开发者后台 · 质量周报</span>
          <span aria-hidden>→</span>
        </Link>
      )}

      <section className="surface-panel p-4">
        <h2 className="font-semibold text-primary">个人资料</h2>

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

      <section className="surface-card p-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-semibold text-primary">打卡墙样式</h2>
          {wallStyleSaveState === 'saving' && (
            <span className="text-xs text-muted">保存中…</span>
          )}
          {wallStyleSaveState === 'saved' && (
            <span className="text-xs text-brand">已保存</span>
          )}
          {wallStyleSaveState === 'error' && (
            <span className="text-xs text-amber-400">保存失败</span>
          )}
        </div>
        <fieldset className="mt-3 space-y-2">
          <legend className="sr-only">打卡墙样式</legend>
          <label className="wall-style-option flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5">
            <input
              type="radio"
              name="wall_style"
              value="classic"
              checked={wallStyle === 'classic'}
              onChange={() => setWallStyle('classic')}
              className="mt-1"
            />
            <span className="text-sm">
              <span className="font-medium text-primary">经典版</span>
              <span className="mt-0.5 block text-xs text-muted">
                同时展示运动和代谢
              </span>
            </span>
          </label>
          <label className="wall-style-option flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5">
            <input
              type="radio"
              name="wall_style"
              value="split"
              checked={wallStyle === 'split'}
              onChange={() => setWallStyle('split')}
              className="mt-1"
            />
            <span className="text-sm">
              <span className="font-medium text-primary">分屏版</span>
              <span className="mt-0.5 block text-xs text-muted">
                切换查看，更聚焦
              </span>
            </span>
          </label>
        </fieldset>
      </section>

      <section className="surface-panel p-4">
        <h2 className="font-semibold text-primary">风格</h2>
        <p className="mt-1 text-sm text-muted">选择你喜欢的界面配色</p>
        <div className="mt-3 space-y-2">
          {styleOptions.map((item) => {
            const active = style === item.id
            const optionClassName = [
              'style-option',
              item.optionClassName,
              active ? `${item.optionClassName}--active` : '',
            ]
              .filter(Boolean)
              .join(' ')
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setStyle(item.id)}
                className={optionClassName}
                aria-pressed={active}
              >
                <span className="flex items-center justify-between gap-3">
                  <span>
                    <span className="block text-sm font-medium text-primary">
                      {item.title}
                    </span>
                    <span className="block text-xs text-muted">{item.description}</span>
                  </span>
                  <span
                    aria-hidden
                    className={`h-4 w-16 shrink-0 rounded-full ring-1 ring-white/25 ${item.swatchClassName}`}
                  />
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <InstallGuide collapsible />

      <button
        type="button"
        onClick={handleSignOut}
        className="btn-danger w-full py-3"
      >
        退出登录
      </button>
    </div>
  )
}

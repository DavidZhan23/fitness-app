import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AvatarCropEditor } from '../components/AvatarCropEditor'
import { PageShell } from '../components/ui/responsive'
import { HeroCollabSwitch } from '../components/HeroCollabSwitch'
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
import {
  fileToCroppedAvatarDataUrl,
  loadImage,
  type AvatarCropRect,
} from '../lib/avatarImage'
import { getHeroCollabConfig } from '../lib/themeMeta'
import type { Sex, WallStyle } from '../types'

type StyleToneGroup = 'light' | 'dark'

const styleToneSections: Array<{ group: StyleToneGroup; title: string }> = [
  { group: 'dark', title: '深色系' },
  { group: 'light', title: '浅色系' },
]

const styleOptions: Array<{
  id: AppStyle
  group: StyleToneGroup
  title: string
  description: string
  swatchClassName: string
  optionClassName: string
}> = [
  {
    id: 'eva',
    group: 'dark',
    title: '暴走初号机',
    description: '深黑紫机甲底 · 荧光绿运动缺口 · 插入栓橙饮食',
    swatchClassName: 'style-swatch-eva',
    optionClassName: 'style-option-eva',
  },
  {
    id: 'eva-unit02',
    group: 'dark',
    title: '烈焰二号机',
    description: '深黑红驾驶舱 · 二号机红主操 · 橙黄饮食 · 荧光绿运动缺口',
    swatchClassName: 'style-swatch-eva-unit02',
    optionClassName: 'style-option-eva-unit02',
  },
  {
    id: 'gundam-hangar',
    group: 'dark',
    title: '格纳库提坦斯',
    description: '暗色提坦斯钢蓝格纳库、冷青运动缺口、暗红饮食与盈余，仪表盘感',
    swatchClassName: 'style-swatch-gundam-hangar',
    optionClassName: 'style-option-gundam-hangar',
  },
  {
    id: 'jojo-stardust-duel',
    group: 'dark',
    title: '时停入侵',
    description: '承太郎钴蓝主场 · DIO 金黄绿入侵 · 黑蓝热力图',
    swatchClassName: 'style-swatch-jojo-stardust-duel',
    optionClassName: 'style-option-jojo-stardust-duel',
  },
  {
    id: 'default',
    group: 'dark',
    title: '深海能量',
    description: '偏运动感的深色青绿系',
    swatchClassName: 'style-swatch-ocean',
    optionClassName: 'style-option-ocean',
  },
  {
    id: 'lavender',
    group: 'light',
    title: '薰衣云梦',
    description: '云雾淡紫底、奶白紫卡，薰衣草主操、紫蓝运动、玫瑰紫粉饮食',
    swatchClassName: 'style-swatch-lavender',
    optionClassName: 'style-option-lavender',
  },
  {
    id: 'sakura',
    group: 'light',
    title: '碧空樱缀',
    description: '浅蓝天底、云白蓝卡，亮蓝主操，甜樱粉点缀',
    swatchClassName: 'style-swatch-sakura',
    optionClassName: 'style-option-sakura',
  },
  {
    id: 'sakura-blush',
    group: 'light',
    title: '樱雾漫境',
    description: '樱花粉底、奶粉卡，运动蓝 / 饮食莓粉',
    swatchClassName: 'style-swatch-sakura-blush',
    optionClassName: 'style-option-sakura-blush',
  },
  {
    id: 'active-mint',
    group: 'light',
    title: '轻氧薄荷',
    description: '薄荷雾绿底、奶白薄荷卡，蓝管运动、珊瑚橙管饮食、绿管缺口',
    swatchClassName: 'style-swatch-active-mint',
    optionClassName: 'style-option-active-mint',
  },
  {
    id: 'soy-tea',
    group: 'light',
    title: '豆乳清茶',
    description: '豆乳米杏底、奶绿卡，海盐蓝运动、茶绿缺口、豆乳焦糖饮食',
    swatchClassName: 'style-swatch-soy-tea',
    optionClassName: 'style-option-soy-tea',
  },
  {
    id: 'wood-zen',
    group: 'light',
    title: '木隐茶庭',
    description: '米纸原木底、米杏卡，原木棕主操、苔绿缺口、茶青运动、柿橙饮食',
    swatchClassName: 'style-swatch-wood-zen',
    optionClassName: 'style-option-wood-zen',
  },
]

export function SettingsPage() {
  const { user, profile, updateProfile, signOut } = useAuth()
  const { style, setStyle, isHeroCollabEnabled, setHeroCollabEnabled } = useAppStyle()
  const navigate = useNavigate()
  const appreciationQrSrc = '/赞赏码.jpg'
  const pageRef = useRef<HTMLDivElement>(null)
  const [qrLoadFailed, setQrLoadFailed] = useState(false)
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
  const [welcomeMessage, setWelcomeMessage] = useState(
    profile?.welcome_message ?? '',
  )
  const [threshold, setThreshold] = useState(String(profile?.deficit_threshold ?? 0))
  const [wallStyle, setWallStyle] = useState<WallStyle>(
    () => (profile?.wall_style === 'split' ? 'split' : 'classic'),
  )
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [avatarError, setAvatarError] = useState('')
  const [isAvatarPreviewOpen, setIsAvatarPreviewOpen] = useState(false)
  const [isAvatarCropOpen, setIsAvatarCropOpen] = useState(false)
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null)
  const [cropFile, setCropFile] = useState<File | null>(null)
  const [cropImageSize, setCropImageSize] = useState({ width: 1, height: 1 })
  const [cropRect, setCropRect] = useState<AvatarCropRect>({
    x: 0,
    y: 0,
    size: 1,
  })
  const themeDetailsRef = useRef<HTMLDetailsElement>(null)

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
    setWelcomeMessage(profile.welcome_message ?? '')
    setThreshold(String(profile.deficit_threshold ?? 0))
    setWallStyle(profile.wall_style === 'split' ? 'split' : 'classic')
  }, [profile])

  useEffect(() => {
    const handleOutsidePointer = (event: PointerEvent) => {
      const root = pageRef.current
      if (!root) return
      const target = event.target
      if (!(target instanceof Node)) return
      const openDetails = Array.from(
        root.querySelectorAll<HTMLDetailsElement>('details[open]'),
      )
      if (openDetails.length === 0) return
      const hitOpenDetails = openDetails.some((details) => details.contains(target))
      if (hitOpenDetails) return
      openDetails.forEach((details) => {
        details.open = false
      })
    }

    document.addEventListener('pointerdown', handleOutsidePointer)
    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointer)
    }
  }, [])

  useEffect(() => {
    if (!isAvatarPreviewOpen && !isAvatarCropOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isAvatarPreviewOpen, isAvatarCropOpen])

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (isAvatarCropOpen) {
        setIsAvatarCropOpen(false)
        return
      }
      if (isAvatarPreviewOpen) {
        setIsAvatarPreviewOpen(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isAvatarCropOpen, isAvatarPreviewOpen])

  const trimmedNickname = nickname.trim()
  const savedNickname = (profile?.nickname ?? '').trim()
  const trimmedWelcomeMessage = welcomeMessage.trim()
  const savedWelcomeMessage = (profile?.welcome_message ?? '').trim()
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

  const saveWelcomeMessage = useCallback(async () => {
    await updateProfile({ welcome_message: trimmedWelcomeMessage || null })
  }, [updateProfile, trimmedWelcomeMessage])

  const welcomeMessageAutosave = useDebouncedAutosave({
    enabled: Boolean(profile),
    isEqual: trimmedWelcomeMessage === savedWelcomeMessage,
    save: saveWelcomeMessage,
    mapError: () => '保存失败',
  })
  const welcomeMessageSaveState = welcomeMessageAutosave.state

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
  const currentStyleTitle =
    styleOptions.find((item) => item.id === style)?.title ?? '深海能量'

  const [wallStyleSaveState, setWallStyleSaveState] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle')
  const [wallStyleBusy, setWallStyleBusy] = useState(false)

  const handleWallStyleChange = useCallback(
    async (next: WallStyle) => {
      if (wallStyleBusy || next === wallStyle) return
      setWallStyle(next)
      setWallStyleSaveState('saving')
      setWallStyleBusy(true)
      try {
        await updateProfile({ wall_style: next })
        setWallStyleSaveState('saved')
      } catch {
        setWallStyle(savedWallStyle)
        setWallStyleSaveState('error')
      } finally {
        setWallStyleBusy(false)
      }
    },
    [wallStyleBusy, wallStyle, savedWallStyle, updateProfile],
  )

  useEffect(() => {
    if (wallStyleSaveState !== 'saved') return
    const timer = window.setTimeout(() => setWallStyleSaveState('idle'), 3000)
    return () => clearTimeout(timer)
  }, [wallStyleSaveState])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const handleAvatarPick = () => {
    if (!avatarBusy) avatarInputRef.current?.click()
  }

  const clearCropState = useCallback(() => {
    if (cropImageUrl) URL.revokeObjectURL(cropImageUrl)
    setCropImageUrl(null)
    setCropFile(null)
    setCropRect({ x: 0, y: 0, size: 1 })
    setCropImageSize({ width: 1, height: 1 })
  }, [cropImageUrl])

  const handleAvatarFile = async (file: File | undefined) => {
    if (!file || avatarBusy) return
    setAvatarError('')
    try {
      const image = await loadImage(file)
      const objectUrl = URL.createObjectURL(file)
      const defaultSize = Math.max(1, Math.min(image.width, image.height))
      clearCropState()
      setCropFile(file)
      setCropImageUrl(objectUrl)
      setCropImageSize({ width: image.width, height: image.height })
      setCropRect({
        size: defaultSize,
        x: (image.width - defaultSize) / 2,
        y: (image.height - defaultSize) / 2,
      })
      setIsAvatarPreviewOpen(false)
      setIsAvatarCropOpen(true)
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : '上传失败')
    }
    if (avatarInputRef.current) avatarInputRef.current.value = ''
  }

  const closeCropModal = useCallback(() => {
    setIsAvatarCropOpen(false)
    clearCropState()
  }, [clearCropState])

  useEffect(() => {
    if (isAvatarCropOpen || !cropImageUrl) return
    clearCropState()
  }, [clearCropState, cropImageUrl, isAvatarCropOpen])

  const handleConfirmAvatarCrop = async () => {
    if (!cropFile || avatarBusy) return
    setAvatarBusy(true)
    setAvatarError('')
    try {
      const dataUrl = await fileToCroppedAvatarDataUrl(cropFile, cropRect)
      await updateProfile({ avatar_url: dataUrl })
      closeCropModal()
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : '上传失败')
    } finally {
      setAvatarBusy(false)
    }
  }

  return (
    <div ref={pageRef}>
      <PageShell>
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

        <div className="mt-3 flex items-start gap-3">
          <div className="flex shrink-0 flex-col items-center">
            <button
              type="button"
              disabled={avatarBusy}
              onClick={() => setIsAvatarPreviewOpen(true)}
              className="profile-avatar-btn relative rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50"
              aria-label="查看头像"
            >
              <UserAvatar profile={profile} user={user} size="lg" />
              {avatarBusy && (
                <span
                  className="profile-avatar-btn__busy absolute inset-0 flex items-center justify-center rounded-full text-[10px] font-medium text-primary"
                  aria-hidden
                >
                  处理中…
                </span>
              )}
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => void handleAvatarFile(e.target.files?.[0])}
            />
            {avatarError && (
              <p className="mt-1 max-w-[5.5rem] text-center text-[10px] text-danger">
                {avatarError}
              </p>
            )}
          </div>
          <div className="profile-nickname-field min-w-0 flex-1">
            <div className="relative">
              <input
                type="text"
                maxLength={32}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="input profile-nickname-field__input w-full"
                placeholder="输入你的昵称"
                aria-label="昵称"
              />
              <span
                className="profile-nickname-field__edit-icon pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
                aria-hidden
              >
                <svg viewBox="0 0 24 24" width="1.125rem" height="1.125rem" fill="none">
                  <path
                    d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0 0-3L16.5 4.5a2.1 2.1 0 0 0-3 0L3 15v5z"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M13.5 6.5l4 4"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </div>
            {nicknameSaveState === 'saving' && (
              <p className="mt-1 text-xs text-muted">保存中…</p>
            )}
            {nicknameSaveState === 'saved' && (
              <p className="mt-1 text-xs text-brand">已保存</p>
            )}
            {nicknameSaveState === 'error' && (
              <p className="mt-1 text-xs text-danger">保存失败</p>
            )}

            <div className="profile-welcome-field mt-3">
              <div className="relative">
                <input
                  type="text"
                  maxLength={30}
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  className="input profile-welcome-field__input w-full"
                  placeholder="自定义首页标题"
                  aria-label="自定义首页标题"
                />
                <span
                  className="profile-welcome-field__edit-icon pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
                  aria-hidden
                >
                  <svg viewBox="0 0 24 24" width="1.125rem" height="1.125rem" fill="none">
                    <path
                      d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0 0-3L16.5 4.5a2.1 2.1 0 0 0-3 0L3 15v5z"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M13.5 6.5l4 4"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </div>
              {welcomeMessageSaveState === 'saving' && (
                <p className="mt-1 text-xs text-muted">保存中…</p>
              )}
              {welcomeMessageSaveState === 'saved' && (
                <p className="mt-1 text-xs text-brand">已保存</p>
              )}
              {welcomeMessageSaveState === 'error' && (
                <p className="mt-1 text-xs text-danger">保存失败</p>
              )}
            </div>
          </div>
        </div>

        {profile && (
          <MetabolismSummary profile={profile} variant="embedded" />
        )}

        <details className="group mt-3 border-t border-slate-600/40 pt-3">
          <summary className="settings-menu-summary cursor-pointer list-none text-sm marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="flex items-center justify-between gap-2">
              编辑身体资料
              <span
                className="settings-menu-chevron transition-transform duration-[450ms] ease-out group-open:rotate-90"
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

      <section className="surface-card p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-primary">打卡墙样式</h2>
          <div className="text-xs">
            {wallStyleSaveState === 'saving' && (
              <span className="text-muted">保存中…</span>
            )}
            {wallStyleSaveState === 'saved' && (
              <span className="text-brand">已保存</span>
            )}
            {wallStyleSaveState === 'error' && (
              <span className="text-amber-400">保存失败</span>
            )}
          </div>
        </div>
        <fieldset className="mt-2 space-y-2">
          <legend className="sr-only">打卡墙样式</legend>
          <label className="wall-style-option flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5">
            <input
              type="radio"
              name="wall_style"
              value="classic"
              checked={wallStyle === 'classic'}
              disabled={wallStyleBusy}
              onChange={() => void handleWallStyleChange('classic')}
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
              disabled={wallStyleBusy}
              onChange={() => void handleWallStyleChange('split')}
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
        <details
          className="group"
          onToggle={(event) => {
            const details = event.currentTarget
            if (!details.open) return
            requestAnimationFrame(() => {
              themeDetailsRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
              })
            })
          }}
          ref={themeDetailsRef}
        >
          <summary className="settings-menu-summary cursor-pointer list-none text-sm marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="flex items-center justify-between gap-2">
              主题风格 · {currentStyleTitle}
              <span
                className="settings-menu-chevron transition-transform duration-[450ms] ease-out group-open:rotate-90"
                aria-hidden
              >
                ▸
              </span>
            </span>
          </summary>
          <div className="mt-4 border-t border-slate-600/40 pt-4">
            <div className="space-y-4">
              {styleToneSections.map((section) => (
                <div key={section.group}>
                  <h3 className="text-xs font-medium text-secondary">
                    {section.title}
                  </h3>
                  <div className="mt-2 space-y-2">
                    {styleOptions
                      .filter((item) => item.group === section.group)
                      .map((item) => {
                        const active = style === item.id
                        const collabConfig = getHeroCollabConfig(item.id)
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
                                <span className="flex items-center gap-1.5">
                                  <span className="text-sm font-medium text-primary">
                                    {item.title}
                                  </span>
                                  {collabConfig ? (
                                    <HeroCollabSwitch
                                      styleId={item.id}
                                      enabled={isHeroCollabEnabled(item.id)}
                                      label={collabConfig.label}
                                      onChange={(next) =>
                                        setHeroCollabEnabled(item.id, next)
                                      }
                                    />
                                  ) : null}
                                </span>
                                <span className="mt-0.5 block text-xs text-muted">
                                  {item.description}
                                </span>
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
                </div>
              ))}
            </div>
          </div>
        </details>
      </section>

      <section className="surface-panel p-4">
        <details className="group">
          <summary className="settings-menu-summary cursor-pointer list-none text-sm marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="flex items-center justify-between gap-2">
              我要打赏
              <span
                className="settings-menu-chevron transition-transform duration-[450ms] ease-out group-open:rotate-90"
                aria-hidden
              >
                ▸
              </span>
            </span>
          </summary>
          <div className="mt-4 border-t border-slate-600/40 pt-4">
            <p className="mb-3 text-sm text-muted">
              助力开发者买token继续开发˵&gt;ㅿ&lt;˵
            </p>
            {!qrLoadFailed ? (
              <img
                src={appreciationQrSrc}
                alt="开发者赞赏码"
                className="w-full max-w-xs rounded-xl border border-slate-500/40"
                onError={() => setQrLoadFailed(true)}
              />
            ) : (
              <div className="rounded-xl border border-dashed border-slate-500/50 px-3 py-3 text-xs text-muted">
                当前环境无法直接读取本地赞赏码图片。你可以把图片放到
                <code className="mx-1 rounded bg-black/20 px-1 py-0.5">public/赞赏码.png</code>
                后，我再帮你改成稳定展示。
              </div>
            )}
          </div>
        </details>
      </section>

      <InstallGuide collapsible />

      <button
        type="button"
        onClick={handleSignOut}
        className="btn-sign-out w-full py-3"
      >
        退出登录
      </button>
      </PageShell>

      {isAvatarPreviewOpen && (
        <div className="settings-avatar-modal" role="dialog" aria-modal="true">
          <button
            type="button"
            className="settings-avatar-modal__backdrop"
            aria-label="关闭头像预览"
            onClick={() => setIsAvatarPreviewOpen(false)}
          />
          <div className="settings-avatar-modal__panel">
            <button
              type="button"
              className="settings-avatar-modal__close"
              onClick={() => setIsAvatarPreviewOpen(false)}
              aria-label="关闭头像预览"
            >
              ×
            </button>
            <div className="settings-avatar-modal__preview">
              <UserAvatar profile={profile} user={user} size="lg" className="h-44 w-44 text-5xl" />
            </div>
            <button
              type="button"
              className="btn-primary settings-avatar-modal__pick"
              onClick={handleAvatarPick}
              disabled={avatarBusy}
            >
              更换头像
            </button>
          </div>
        </div>
      )}

      {isAvatarCropOpen && cropImageUrl && (
        <div className="settings-avatar-crop-modal" role="dialog" aria-modal="true">
          <button
            type="button"
            className="settings-avatar-crop-modal__backdrop"
            aria-label="关闭头像裁剪"
            onClick={closeCropModal}
          />
          <div className="settings-avatar-crop-modal__panel">
            <h3 className="text-base font-semibold text-primary">裁剪头像</h3>
            <p className="mt-1 text-xs text-muted">
              拖动移动图片；双指捏合或触控板两指缩放（滚轮也可缩放）。
            </p>
            <div className="settings-avatar-crop-modal__stage mt-3">
              <AvatarCropEditor
                imageUrl={cropImageUrl}
                imageWidth={cropImageSize.width}
                imageHeight={cropImageSize.height}
                onCropRectChange={setCropRect}
              />
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={closeCropModal}>
                取消
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => void handleConfirmAvatarCrop()}
                disabled={avatarBusy}
              >
                {avatarBusy ? '保存中…' : '确认上传'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

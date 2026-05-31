import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { AppStyle } from '../context/StyleContext'
import { useAppStyle } from '../context/StyleContext'
import { ACTIVITY_LEVELS } from '../lib/calories'
import { ageFromBirthdayKey, formatTodayDateKey, parseBirthdayKey } from '../lib/birthday'
import {
  DEFICIT_GOAL_MAX,
  DEFICIT_GOAL_MIN,
  DEFICIT_GOAL_PRESETS,
  parseDeficitGoalInput,
} from '../lib/deficitGoal'
import {
  ONBOARDING_STYLE_DESCRIPTIONS,
  onboardingStyleSections,
} from '../lib/styleOptions'
import type { Sex } from '../types'

type OnboardingStep = 'brand' | 'welcome' | 'body' | 'goal' | 'style'

const STEPS: OnboardingStep[] = ['brand', 'welcome', 'body', 'goal', 'style']

const WELCOME_VALUES = [
  '记录运动和饮食',
  '看见今日缺口',
  '点亮称号，和健友轻互动',
] as const

export function OnboardingPage() {
  const { profile, completeOnboarding } = useAuth()
  const { setStyle } = useAppStyle()
  const navigate = useNavigate()

  const [step, setStep] = useState<OnboardingStep>('brand')
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [birthday, setBirthday] = useState('')
  const [sex, setSex] = useState<Sex>('male')
  const [activity, setActivity] = useState(1.375)
  const [selectedGoal, setSelectedGoal] = useState<number | 'custom'>(300)
  const [customGoalValue, setCustomGoalValue] = useState('300')
  const [selectedStyle, setSelectedStyle] = useState<AppStyle>('default')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const todayKey = formatTodayDateKey()
  const derivedAge = birthday ? ageFromBirthdayKey(birthday) : null
  const stepIndex = STEPS.indexOf(step)

  useEffect(() => {
    if (step !== 'style') return
    setStyle(selectedStyle)
  }, [step, selectedStyle, setStyle])

  if (profile?.onboarding_complete) {
    return <Navigate to="/" replace />
  }

  const validateBody = (): {
    weight_kg: number
    height_cm: number
    birthday: string
  } | null => {
    const w = parseFloat(weight)
    const h = parseFloat(height)
    const parsedBirthday = parseBirthdayKey(birthday)
    const derived = parsedBirthday ? ageFromBirthdayKey(parsedBirthday) : null
    if (!w || !h) {
      setError('请填写有效的体重和身高')
      return null
    }
    if (!parsedBirthday || !derived) {
      setError('请填写有效的生日')
      return null
    }
    return { weight_kg: w, height_cm: h, birthday: parsedBirthday }
  }

  const resolveGoalThreshold = (): number | null => {
    if (selectedGoal !== 'custom') return selectedGoal
    return parseDeficitGoalInput(customGoalValue)
  }

  const handleBodyNext = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (validateBody()) setStep('goal')
  }

  const handleGoalNext = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const threshold = resolveGoalThreshold()
    if (threshold == null) {
      setError(`请输入 ${DEFICIT_GOAL_MIN}–${DEFICIT_GOAL_MAX} 之间的整数 kcal`)
      return
    }
    setStep('style')
  }

  const finishOnboarding = async (style?: AppStyle) => {
    const finalStyle = style ?? selectedStyle ?? 'default'
    setError('')
    const body = validateBody()
    if (!body) {
      setStep('body')
      return
    }
    const threshold = resolveGoalThreshold()
    if (threshold == null) {
      setError(`请输入 ${DEFICIT_GOAL_MIN}–${DEFICIT_GOAL_MAX} 之间的整数 kcal`)
      setStep('goal')
      return
    }
    setLoading(true)
    try {
      setStyle(finalStyle)
      await completeOnboarding({
        ...body,
        sex,
        activity_factor: activity,
        deficit_threshold: threshold,
      })
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setLoading(false)
    }
  }

  const selectPreset = (kcal: number) => {
    setSelectedGoal(kcal)
    setCustomGoalValue(String(kcal))
    setError('')
  }

  return (
    <div className="page-standalone onboarding-shell">
      <div className="onboarding-card">
        <p className="onboarding-step-label" aria-live="polite">
          第 {stepIndex + 1} 步，共 {STEPS.length} 步
        </p>

        {step === 'brand' && (
          <div className="onboarding-step">
            <h1 className="onboarding-title">满打满算</h1>
            <p className="onboarding-quote">
              小满，是二十四节气里最温柔的提醒：
              <br />
              花未全开，月未全圆，刚刚好。
            </p>
            <p className="onboarding-subtitle">
              我们不催你做到满分，只陪你把每天的运动、饮食和热量缺口，慢慢看清楚。
            </p>
            <button
              type="button"
              className="btn-primary onboarding-primary-btn"
              onClick={() => {
                setError('')
                setStep('welcome')
              }}
            >
              继续
            </button>
          </div>
        )}

        {step === 'welcome' && (
          <div className="onboarding-step">
            <h1 className="onboarding-title">欢迎你，健友</h1>
            <p className="onboarding-subtitle">
              这里不会逼你做复杂计划，只帮你每天看见一点点变化。
            </p>
            <ul className="onboarding-value-list">
              {WELCOME_VALUES.map((text) => (
                <li key={text} className="onboarding-value-pill">
                  {text}
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="btn-primary onboarding-primary-btn"
              onClick={() => {
                setError('')
                setStep('body')
              }}
            >
              开始设置
            </button>
          </div>
        )}

        {step === 'body' && (
          <div className="onboarding-step">
            <h1 className="onboarding-title">了解一下你的基础消耗</h1>
            <p className="onboarding-subtitle">
              这些资料只用于估算基础代谢和每日消耗，之后可以在设置里修改。
            </p>
            <form onSubmit={handleBodyNext} className="onboarding-form">
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
              <Field label="生日">
                <input
                  type="date"
                  max={todayKey}
                  required
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  className="input"
                />
                {derivedAge != null && (
                  <p className="onboarding-field-hint">
                    {birthday}（{derivedAge} 岁）
                  </p>
                )}
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
              {error ? <p className="onboarding-error">{error}</p> : null}
              <button
                type="submit"
                className="btn-primary onboarding-primary-btn"
              >
                下一步
              </button>
            </form>
          </div>
        )}

        {step === 'goal' && (
          <div className="onboarding-step">
            <h1 className="onboarding-title">先选一个轻松目标</h1>
            <p className="onboarding-subtitle">
              这是你希望每天达到的热量缺口，之后可以在今日页随时调整。
            </p>
            <form onSubmit={handleGoalNext} className="onboarding-form">
              <div className="deficit-goal-sheet__preset-grid onboarding-goal-grid">
                {DEFICIT_GOAL_PRESETS.map((preset) => (
                  <button
                    key={preset.kcal}
                    type="button"
                    className="deficit-goal-sheet__preset-card"
                    aria-pressed={selectedGoal === preset.kcal}
                    onClick={() => selectPreset(preset.kcal)}
                  >
                    <span className="deficit-goal-sheet__preset-kcal tabular-nums">
                      {preset.kcal} kcal
                    </span>
                    <span className="deficit-goal-sheet__preset-label">
                      {preset.label}
                    </span>
                  </button>
                ))}
              </div>
              <div className="deficit-goal-sheet__custom">
                <span className="deficit-goal-sheet__custom-label text-xs text-muted">
                  自定义
                </span>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="number"
                    min={DEFICIT_GOAL_MIN}
                    max={DEFICIT_GOAL_MAX}
                    step={1}
                    inputMode="numeric"
                    value={customGoalValue}
                    onChange={(e) => {
                      setSelectedGoal('custom')
                      setCustomGoalValue(e.target.value)
                      setError('')
                    }}
                    onFocus={() => setSelectedGoal('custom')}
                    className="input min-w-0 flex-1 py-2 text-sm tabular-nums"
                    aria-label="自定义目标缺口 kcal"
                  />
                  <span className="shrink-0 text-sm text-muted">kcal</span>
                </div>
              </div>
              {error ? <p className="onboarding-error">{error}</p> : null}
              <button
                type="submit"
                className="btn-primary onboarding-primary-btn"
              >
                下一步
              </button>
            </form>
          </div>
        )}

        {step === 'style' && (
          <div className="onboarding-step onboarding-step--style">
            <div className="onboarding-style-header">
              <h1 className="onboarding-title">选择你的打卡氛围</h1>
              <p className="onboarding-subtitle">
                每天看到喜欢的界面，更容易坚持一点。
              </p>
              <p className="onboarding-hint">
                只是先选一个开始，之后可以随时在设置里切换。
              </p>
            </div>
            <div className="onboarding-style-sections">
              {onboardingStyleSections().map((section) => (
                <div key={section.group} className="onboarding-style-section">
                  <p className="onboarding-style-group-label">{section.title}</p>
                  <div className="onboarding-style-list">
                    {section.options.map((item) => {
                      const active = selectedStyle === item.id
                      const optionClassName = [
                        'style-option',
                        'onboarding-style-row',
                        item.optionClassName,
                        active ? `${item.optionClassName}--active` : '',
                      ]
                        .filter(Boolean)
                        .join(' ')
                      return (
                        <button
                          key={item.id}
                          type="button"
                          disabled={loading}
                          className={optionClassName}
                          aria-pressed={active}
                          onClick={() => {
                            setSelectedStyle(item.id)
                            setStyle(item.id)
                          }}
                        >
                          <div className="onboarding-style-row__content">
                            <span className="onboarding-style-row__title text-primary">
                              {item.title}
                            </span>
                            <span className="onboarding-style-row__desc text-muted">
                              {ONBOARDING_STYLE_DESCRIPTIONS[item.id] ??
                                item.description}
                            </span>
                          </div>
                          <span
                            className={`onboarding-style-row__swatch shrink-0 rounded-full ring-1 ring-white/25 ${item.swatchClassName}`}
                            aria-hidden
                          />
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            {error ? <p className="onboarding-error">{error}</p> : null}
            <div className="onboarding-actions">
              <button
                type="button"
                disabled={loading}
                className="btn-primary onboarding-primary-btn onboarding-primary-button"
                onClick={() => void finishOnboarding()}
              >
                {loading ? '保存中…' : '开始使用'}
              </button>
            </div>
          </div>
        )}
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
    <label className="onboarding-field block min-w-0 max-w-full">
      <span className="text-sm text-muted">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}

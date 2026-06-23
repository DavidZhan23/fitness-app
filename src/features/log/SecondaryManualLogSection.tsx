import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import { ResponsiveForm } from '../../components/ui/responsive'
import { KJ_PER_KCAL } from '../../lib/calories'
import {
  buildTemplateFromLogItem,
  formatTemplateSaveNotice,
  parseNameQuantityUnit,
  saveTemplatesFromItems,
} from '../../lib/logTemplate'
import type { MealInputMode } from '../../hooks/useLogForm'
import type { LogTemplate } from '../../types'

interface SpeechRecognitionEventLike {
  resultIndex: number
  results: {
    length: number
    [index: number]: {
      0?: { transcript?: string }
    }
  }
}

interface SpeechRecognitionErrorEventLike {
  error?: string
}

interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onstart: (() => void) | null
  onend: (() => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null
  const maybeWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
  return maybeWindow.SpeechRecognition ?? maybeWindow.webkitSpeechRecognition ?? null
}

function appendTranscript(current: string, transcript: string): string {
  const cleanTranscript = transcript.trim()
  if (!cleanTranscript) return current
  const cleanCurrent = current.trim()
  return cleanCurrent ? `${cleanCurrent} ${cleanTranscript}` : cleanTranscript
}

function VoiceIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5 10v4h3l4 4V6L8 10H5Z" />
      <path d="M15 9.2a4 4 0 0 1 0 5.6" />
      <path d="M17.7 6.5a8 8 0 0 1 0 11" />
    </svg>
  )
}

interface SecondaryManualLogSectionProps {
  isExercise: boolean
  kind: 'exercise' | 'meal'
  templates: LogTemplate[]
  loading: boolean
  error: string
  notice: string
  name: string
  onNameChange: (value: string) => void
  kcal: string
  onKcalChange: (value: string) => void
  mealInputMode: MealInputMode
  onMealInputModeChange: (mode: MealInputMode) => void
  grams: string
  onGramsChange: (value: string) => void
  kjPer100g: string
  onKjPer100gChange: (value: string) => void
  packageKcal: number | null
  resolveKcal: () => number | null
  onSubmitLog: (name: string, kcal: number) => Promise<void>
  onComplete: () => void
  addTemplate: (payload: {
    name: string
    unit: string
    kcalPerUnit: number
    defaultQuantity: number
  }) => Promise<unknown>
  onNotice: (message: string) => void
  onError: (message: string) => void
  onSubmittingChange: (loading: boolean) => void
  showNameField?: boolean
  collapsible?: boolean
  titleText?: string
  descriptionText?: string
}

function suggestTemplateFields(input: {
  isExercise: boolean
  name: string
  kcal: number
  mealInputMode: MealInputMode
  grams: string
  kjPer100g: string
  packageKcal: number | null
}) {
  const parsedFromName = parseNameQuantityUnit(input.name.trim())
  if (parsedFromName && input.kcal > 0) {
    const kcalPerUnit = input.kcal / parsedFromName.quantity
    if (Number.isFinite(kcalPerUnit) && kcalPerUnit > 0) {
      return {
        name: parsedFromName.name,
        unit: parsedFromName.unit,
        defaultQuantity: parsedFromName.quantity,
        kcalPerUnit: Math.round(kcalPerUnit * 10000) / 10000,
      }
    }
  }

  if (
    !input.isExercise &&
    input.mealInputMode === 'package' &&
    input.packageKcal != null
  ) {
    const grams = Number(input.grams)
    const kj = Number(input.kjPer100g)
    if (Number.isFinite(grams) && grams > 0 && Number.isFinite(kj) && kj > 0) {
      const kcalPerUnit = kj / KJ_PER_KCAL / 100
      if (Number.isFinite(kcalPerUnit) && kcalPerUnit > 0) {
        return {
          name: input.name.trim(),
          unit: 'g',
          defaultQuantity: grams,
          kcalPerUnit: Math.round(kcalPerUnit * 10000) / 10000,
        }
      }
    }
  }

  return buildTemplateFromLogItem({
    name: input.name.trim(),
    quantity: 1,
    unit: '份',
    kcal: input.kcal,
  })
}

export function SecondaryManualLogSection(props: SecondaryManualLogSectionProps) {
  const {
    resolveKcal,
    isExercise,
    name,
    mealInputMode,
    grams,
    kjPer100g,
    packageKcal,
  } = props
  const isCollapsible = props.collapsible ?? true
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const [expanded, setExpanded] = useState(!isCollapsible)
  const [saveAsTemplate, setSaveAsTemplate] = useState(false)
  const [templateDetailsExpanded, setTemplateDetailsExpanded] = useState(false)
  const [templateFieldsTouched, setTemplateFieldsTouched] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateUnit, setTemplateUnit] = useState('')
  const [templateDefaultQuantity, setTemplateDefaultQuantity] = useState('')
  const [templateKcalPerUnit, setTemplateKcalPerUnit] = useState('')
  const [speechSupported, setSpeechSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const [speechError, setSpeechError] = useState('')

  const applySuggestion = useCallback(() => {
    const kcalValue = resolveKcal()
    if (kcalValue == null || kcalValue <= 0 || !name.trim()) return
    const suggestion = suggestTemplateFields({
      isExercise,
      name,
      kcal: kcalValue,
      mealInputMode,
      grams,
      kjPer100g,
      packageKcal,
    })
    if (!suggestion) return
    setTemplateName(suggestion.name)
    setTemplateUnit(suggestion.unit)
    setTemplateDefaultQuantity(String(suggestion.defaultQuantity))
    setTemplateKcalPerUnit(String(suggestion.kcalPerUnit))
  }, [
    resolveKcal,
    isExercise,
    name,
    mealInputMode,
    grams,
    kjPer100g,
    packageKcal,
  ])

  useEffect(() => {
    if (!saveAsTemplate || templateFieldsTouched) return
    applySuggestion()
  }, [
    saveAsTemplate,
    templateFieldsTouched,
    name,
    props.kcal,
    grams,
    kjPer100g,
    mealInputMode,
    packageKcal,
    isExercise,
    applySuggestion,
  ])

  useEffect(() => {
    if (!isCollapsible) setExpanded(true)
  }, [isCollapsible])

  useEffect(() => {
    setSpeechSupported(getSpeechRecognitionConstructor() != null)
    return () => {
      recognitionRef.current?.abort()
      recognitionRef.current = null
    }
  }, [])

  const sectionTitle = isExercise ? '做了什么运动？' : '吃了什么？'
  const sectionHint = isExercise
    ? '精确填写，直接输入运动名称和消耗热量。'
    : '精确填写，直接输入热量或者食物包装上的营养表填写。'
  const nameAriaLabel = sectionTitle
  const manualBusy = props.loading

  const toggleSpeechInput = () => {
    if (manualBusy) return
    if (!speechSupported) {
      setSpeechError('当前浏览器不支持语音输入，可以先用键盘输入。')
      return
    }
    if (listening) {
      recognitionRef.current?.stop()
      return
    }
    const Recognition = getSpeechRecognitionConstructor()
    if (!Recognition) {
      setSpeechSupported(false)
      setSpeechError('当前浏览器不支持语音输入，可以先用键盘输入。')
      return
    }
    const recognition = new Recognition()
    recognition.lang = 'zh-CN'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onstart = () => {
      setListening(true)
      setSpeechError('')
    }
    recognition.onend = () => setListening(false)
    recognition.onerror = (event) => {
      setListening(false)
      setSpeechError(
        event.error === 'not-allowed'
          ? '没有麦克风权限，请允许后再试。'
          : '语音识别失败，请再试一次。',
      )
    }
    recognition.onresult = (event) => {
      let transcript = ''
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        transcript += event.results[index]?.[0]?.transcript ?? ''
      }
      props.onNameChange(appendTranscript(props.name, transcript))
      setSpeechError('')
    }
    recognitionRef.current = recognition
    try {
      recognition.start()
    } catch {
      setListening(false)
      setSpeechError('语音输入启动失败，请再试一次。')
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const kcalValue = props.resolveKcal()
    if (!props.name.trim() || kcalValue == null || kcalValue <= 0) {
      props.onError(
        props.isExercise || props.mealInputMode === 'kcal'
          ? '请填写名称和有效热量'
          : '请填写名称、克数与千焦/100g',
      )
      return
    }

    props.onSubmittingChange(true)
    props.onError('')
    props.onNotice('')
    try {
      await props.onSubmitLog(props.name.trim(), kcalValue)

      if (saveAsTemplate) {
        const templatePayload = templateFieldsTouched
          ? {
              name: templateName.trim(),
              unit: templateUnit.trim(),
              defaultQuantity: Number(templateDefaultQuantity),
              kcalPerUnit: Number(templateKcalPerUnit),
            }
          : suggestTemplateFields({
              isExercise: props.isExercise,
              name: props.name,
              kcal: kcalValue,
              mealInputMode: props.mealInputMode,
              grams: props.grams,
              kjPer100g: props.kjPer100g,
              packageKcal: props.packageKcal,
            })

        if (templatePayload) {
          const result = await saveTemplatesFromItems({
            existingTemplates: props.templates,
            items: [templatePayload],
            addTemplate: props.addTemplate,
          })
          const notice = formatTemplateSaveNotice(result)
          if (notice) props.onNotice(notice)
        }
      }

      props.onComplete()
    } catch (err) {
      props.onError(err instanceof Error ? err.message : '保存失败')
      props.onSubmittingChange(false)
    }
  }

  const manualForm = (
    <section aria-label="手动填写" className="log-manual-section">
      <ResponsiveForm
        onSubmit={(event) => void handleSubmit(event)}
        className="log-manual-section__form"
      >
        <div className="log-manual-secondary__input-panel">
          {props.showNameField !== false ? (
            isCollapsible ? (
              <div className="log-manual-secondary__field">
                <span className="log-manual-secondary__field-label">名称</span>
                <div
                  className={`log-manual-secondary__name-input${!props.isExercise ? ' log-manual-secondary__name-input--with-voice' : ''}`}
                >
                  <input
                    value={props.name}
                    onChange={(e) => props.onNameChange(e.target.value)}
                    disabled={props.loading}
                    className="input w-full min-w-0"
                    placeholder={
                      props.isExercise
                        ? '例如：慢跑 40 分钟'
                        : '例如：牛肉面 1 碗'
                    }
                    aria-label="名称"
                    required
                  />
                  {!props.isExercise ? (
                    <button
                      type="button"
                      className={`log-ai-composer__icon-btn log-manual-secondary__voice-btn${listening ? ' log-ai-composer__icon-btn--active' : ''}`}
                      aria-label={listening ? '停止语音输入' : '语音输入'}
                      aria-pressed={listening}
                      disabled={manualBusy}
                      onClick={toggleSpeechInput}
                    >
                      <VoiceIcon />
                    </button>
                  ) : null}
                </div>
              </div>
            ) : (
              <div
                className={`log-manual-secondary__name-input${!props.isExercise ? ' log-manual-secondary__name-input--with-voice' : ''}`}
              >
                <input
                  value={props.name}
                  onChange={(e) => props.onNameChange(e.target.value)}
                  disabled={props.loading}
                  className="input w-full min-w-0"
                  placeholder={
                    props.isExercise
                      ? '例如：慢跑 40 分钟'
                      : '例如：牛肉面 1 碗'
                  }
                  aria-label={nameAriaLabel}
                  required
                />
                {!props.isExercise ? (
                  <button
                    type="button"
                    className={`log-ai-composer__icon-btn log-manual-secondary__voice-btn${listening ? ' log-ai-composer__icon-btn--active' : ''}`}
                    aria-label={listening ? '停止语音输入' : '语音输入'}
                    aria-pressed={listening}
                    disabled={manualBusy}
                    onClick={toggleSpeechInput}
                  >
                    <VoiceIcon />
                  </button>
                ) : null}
              </div>
            )
          ) : null}

          {!props.isExercise && speechError ? (
            <p className="text-xs text-red-400">{speechError}</p>
          ) : null}

                    {!props.isExercise && (
                      <div
                        role="group"
                        aria-label="热量输入方式"
                        className="log-meal-mode-tabs flex p-1 text-sm"
                      >
                        <button
                          type="button"
                          onClick={() => props.onMealInputModeChange('package')}
                          className={`flex-1 rounded-md py-2 transition ${
                            props.mealInputMode === 'package'
                              ? 'log-meal-mode-btn--active font-medium'
                              : 'log-meal-mode-btn--idle'
                          }`}
                        >
                          包装标注 (g + kJ)
                        </button>
                        <button
                          type="button"
                          onClick={() => props.onMealInputModeChange('kcal')}
                          className={`flex-1 rounded-md py-2 transition ${
                            props.mealInputMode === 'kcal'
                              ? 'log-meal-mode-btn--active font-medium'
                              : 'log-meal-mode-btn--idle'
                          }`}
                        >
                          直接输入 kcal
                        </button>
                      </div>
                    )}

                    {props.isExercise || props.mealInputMode === 'kcal' ? (
                      <label className="log-manual-secondary__field">
                        <span className="log-manual-secondary__field-label">
                          热量 (kcal)
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={props.kcal}
                          onChange={(e) => props.onKcalChange(e.target.value)}
                          className="input w-full min-w-0 tabular-nums"
                          aria-label="热量 (kcal)"
                          required={
                            props.isExercise || props.mealInputMode === 'kcal'
                          }
                        />
                      </label>
                    ) : (
                      <>
                        <div className="log-manual-secondary__field-grid">
                          <label className="log-manual-secondary__field">
                            <span className="log-manual-secondary__field-label">
                              食用量 (g)
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={props.grams}
                              onChange={(e) =>
                                props.onGramsChange(e.target.value)
                              }
                              className="input w-full min-w-0 tabular-nums"
                              aria-label="食用量 (g)"
                              required
                            />
                          </label>
                          <label className="log-manual-secondary__field">
                            <span className="log-manual-secondary__field-label">
                              能量 (千焦 / 100g)
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={props.kjPer100g}
                              onChange={(e) =>
                                props.onKjPer100gChange(e.target.value)
                              }
                              className="input w-full min-w-0 tabular-nums"
                              aria-label="能量 (千焦 / 100g)"
                              required
                            />
                          </label>
                        </div>
                        <p className="log-manual-secondary__field-hint">
                          按包装标注自动换算：kcal = (g ÷ 100) × (kJ/100g ÷{' '}
                          {KJ_PER_KCAL})
                        </p>
                        {props.packageKcal != null && props.packageKcal > 0 ? (
                          <p className="log-package-kcal-hint px-3 py-2 text-sm">
                            约{' '}
                            <span className="font-semibold tabular-nums">
                              {props.packageKcal}
                            </span>{' '}
                            kcal
                          </p>
                        ) : null}
                      </>
                    )}
                  </div>

                  <div className="log-manual-secondary__template-block">
                    <label className="log-ai-item-card__template-option">
                      <input
                        type="checkbox"
                        aria-label="保存为快捷模板"
                        checked={saveAsTemplate}
                        onChange={(e) => {
                          const checked = e.target.checked
                          setSaveAsTemplate(checked)
                          if (!checked) {
                            setTemplateDetailsExpanded(false)
                          }
                          if (checked && !templateFieldsTouched) {
                            applySuggestion()
                          }
                        }}
                        disabled={props.loading}
                      />
                      <span className="log-ai-item-card__template-copy">
                        <strong className="log-ai-item-card__template-title">
                          保存为快捷模板
                        </strong>
                        <span className="log-ai-item-card__template-desc">
                          下次可直接点选，系统会按数量自动计算热量。
                        </span>
                      </span>
                    </label>
                    <button
                      type="button"
                      className="log-manual-secondary__template-details-btn"
                      aria-expanded={templateDetailsExpanded}
                      disabled={!saveAsTemplate || props.loading}
                      onClick={() => {
                        setTemplateDetailsExpanded((value) => !value)
                        if (!templateFieldsTouched) {
                          applySuggestion()
                        }
                      }}
                    >
                      {templateDetailsExpanded ? '收起' : '详情/调整'}
                    </button>
                  </div>

                  {saveAsTemplate && templateDetailsExpanded ? (
                    <div className="log-template-fields">
                      <label className="log-manual-secondary__field">
                        <span className="log-manual-secondary__field-label">
                          模板名称
                        </span>
                        <input
                          value={templateName}
                          onChange={(e) => {
                            setTemplateFieldsTouched(true)
                            setTemplateName(e.target.value)
                          }}
                          className="input w-full min-w-0"
                          aria-label="模板名称"
                        />
                      </label>
                      <label className="log-manual-secondary__field">
                        <span className="log-manual-secondary__field-label">
                          模板单位
                        </span>
                        <input
                          value={templateUnit}
                          aria-label="模板单位"
                          onChange={(e) => {
                            setTemplateFieldsTouched(true)
                            setTemplateUnit(e.target.value)
                          }}
                          className="input w-full min-w-0"
                        />
                      </label>
                      <label className="log-manual-secondary__field">
                        <span className="log-manual-secondary__field-label">
                          默认数量
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={templateDefaultQuantity}
                          onChange={(e) => {
                            setTemplateFieldsTouched(true)
                            setTemplateDefaultQuantity(e.target.value)
                          }}
                          className="input w-full min-w-0 tabular-nums"
                          aria-label="默认数量"
                        />
                      </label>
                      <label className="log-manual-secondary__field">
                        <span className="log-manual-secondary__field-label">
                          单位热量 (kcal / 单位)
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={templateKcalPerUnit}
                          onChange={(e) => {
                            setTemplateFieldsTouched(true)
                            setTemplateKcalPerUnit(e.target.value)
                          }}
                          className="input w-full min-w-0 tabular-nums"
                          aria-label="单位热量 (kcal / 单位)"
                        />
                      </label>
                    </div>
                  ) : null}

                  {props.error ? (
                    <p className="text-sm text-red-400">{props.error}</p>
                  ) : null}
                  {props.notice ? (
                    <p className="text-sm text-secondary">{props.notice}</p>
                  ) : null}

        <button
          type="submit"
          disabled={props.loading}
          className="btn-primary w-full py-3 disabled:opacity-50"
        >
          {props.loading ? '保存中…' : '保存本次记录'}
        </button>
      </ResponsiveForm>
    </section>
  )

  if (!isCollapsible) {
    return (
      <div className="log-ai-card log-ai-card--section">
        <header className="log-ai-card__header">
          <h2 className="log-section-title">{sectionTitle}</h2>
          <p className="log-ai-card__hint">{sectionHint}</p>
        </header>
        {manualForm}
      </div>
    )
  }

  return (
    <div className="log-manual-secondary">
      <div className="log-manual-secondary__card">
        <button
          type="button"
          className="log-manual-secondary__toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          <span className="log-manual-secondary__copy">
            <strong className="log-manual-secondary__title">
              {props.titleText ?? '不用 AI？直接填写 kcal'}
            </strong>
            <span className="log-manual-secondary__desc">
              {props.descriptionText ?? '已知道热量时，可以直接保存本次记录。'}
            </span>
          </span>
          <span className="log-manual-secondary__action" aria-hidden="true">
            {expanded ? '收起' : '展开'}
          </span>
        </button>

        {expanded ? (
          <div className="log-manual-secondary__body">
            <div className="log-manual-secondary__body-card">{manualForm}</div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

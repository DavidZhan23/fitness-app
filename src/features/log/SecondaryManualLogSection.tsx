import { useEffect, useState, type FormEvent } from 'react'
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
  const [expanded, setExpanded] = useState(false)
  const [saveAsTemplate, setSaveAsTemplate] = useState(false)
  const [templateFieldsTouched, setTemplateFieldsTouched] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateUnit, setTemplateUnit] = useState('')
  const [templateDefaultQuantity, setTemplateDefaultQuantity] = useState('')
  const [templateKcalPerUnit, setTemplateKcalPerUnit] = useState('')

  const applySuggestion = () => {
    const kcalValue = props.resolveKcal()
    if (kcalValue == null || kcalValue <= 0 || !props.name.trim()) return
    const suggestion = suggestTemplateFields({
      isExercise: props.isExercise,
      name: props.name,
      kcal: kcalValue,
      mealInputMode: props.mealInputMode,
      grams: props.grams,
      kjPer100g: props.kjPer100g,
      packageKcal: props.packageKcal,
    })
    if (!suggestion) return
    setTemplateName(suggestion.name)
    setTemplateUnit(suggestion.unit)
    setTemplateDefaultQuantity(String(suggestion.defaultQuantity))
    setTemplateKcalPerUnit(String(suggestion.kcalPerUnit))
  }

  useEffect(() => {
    if (!saveAsTemplate || templateFieldsTouched) return
    applySuggestion()
  }, [
    saveAsTemplate,
    templateFieldsTouched,
    props.name,
    props.kcal,
    props.grams,
    props.kjPer100g,
    props.mealInputMode,
    props.packageKcal,
    props.isExercise,
  ])

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
              不用 AI？直接填写 kcal
            </strong>
            <span className="log-manual-secondary__desc">
              已知道热量时，可以直接保存本次记录。
            </span>
          </span>
          <span className="log-manual-secondary__action" aria-hidden="true">
            {expanded ? '收起' : '展开'}
          </span>
        </button>

        {expanded ? (
          <div className="log-manual-secondary__body">
            <div className="log-manual-secondary__body-card">
              <section aria-label="手动填写" className="log-manual-section">
                <ResponsiveForm
                  onSubmit={(event) => void handleSubmit(event)}
                  className="log-manual-section__form"
                >
                  <label className="log-manual-secondary__field">
                    <span className="log-manual-secondary__field-label">
                      名称
                    </span>
                    <input
                      value={props.name}
                      onChange={(e) => props.onNameChange(e.target.value)}
                      disabled={props.loading}
                      className="input w-full min-w-0"
                      aria-label="名称"
                      required
                    />
                  </label>

                  {!props.isExercise && (
                    <div
                      role="group"
                      aria-label="热量输入方式"
                      className="log-meal-mode-tabs flex p-1 text-sm"
                    >
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
                      <label className="log-manual-secondary__field">
                        <span className="log-manual-secondary__field-label">
                          食用量 (g)
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={props.grams}
                          onChange={(e) => props.onGramsChange(e.target.value)}
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
                        <p className="log-manual-secondary__field-hint">
                          按包装标注自动换算：kcal = (g ÷ 100) × (kJ/100g ÷{' '}
                          {KJ_PER_KCAL})
                        </p>
                      </label>
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

                  <label className="log-manual-secondary__template-option">
                    <input
                      type="checkbox"
                      aria-label="同时保存为快捷模板"
                      checked={saveAsTemplate}
                      onChange={(e) => {
                        const checked = e.target.checked
                        setSaveAsTemplate(checked)
                        if (checked && !templateFieldsTouched) {
                          applySuggestion()
                        }
                      }}
                      disabled={props.loading}
                    />
                    <span className="log-manual-secondary__template-copy">
                      <strong className="log-manual-secondary__template-title">
                        同时保存为快捷模板
                      </strong>
                      <span className="log-manual-secondary__template-desc">
                        保存后下次可以直接点选
                      </span>
                    </span>
                  </label>

                  {saveAsTemplate ? (
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
                    className="log-manual-secondary__submit"
                  >
                    {props.loading ? '保存中…' : '保存'}
                  </button>
                </ResponsiveForm>
              </section>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

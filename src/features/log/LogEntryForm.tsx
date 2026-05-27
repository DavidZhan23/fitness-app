import type { FormEvent } from 'react'
import { AiKcalEstimate } from '../../components/AiKcalEstimate'
import { KJ_PER_KCAL } from '../../lib/calories'
import type { MealInputMode } from '../../hooks/useLogForm'

interface LogEntryFormProps {
  kind: 'exercise' | 'meal'
  isExercise: boolean
  loading: boolean
  error: string
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
  onEstimated: (value: number) => void
  onAiOutcome: (outcome: 'success' | 'timeout' | 'error') => void
  onSubmit: (event: FormEvent) => void
}

export function LogEntryForm(props: LogEntryFormProps) {
  return (
    <form onSubmit={props.onSubmit} className="space-y-4 pb-8">
      <AiKcalEstimate
        kind={props.kind}
        name={props.name}
        onNameChange={props.onNameChange}
        disabled={props.loading}
        onEstimated={props.onEstimated}
        onAiOutcome={props.onAiOutcome}
      />

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
        <label className="block">
          <span className="text-sm text-muted">热量 (kcal)</span>
          <input
            type="number"
            min="0"
            step="1"
            value={props.kcal}
            onChange={(e) => props.onKcalChange(e.target.value)}
            className="input mt-1"
            placeholder="300"
            required={props.isExercise || props.mealInputMode === 'kcal'}
          />
        </label>
      ) : (
        <>
          <label className="block">
            <span className="text-sm text-muted">食用量 (g)</span>
            <input
              type="number"
              min="0"
              step="1"
              value={props.grams}
              onChange={(e) => props.onGramsChange(e.target.value)}
              className="input mt-1"
              placeholder="例如：50"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm text-muted">能量 (千焦 / 100g)</span>
            <input
              type="number"
              min="0"
              step="1"
              value={props.kjPer100g}
              onChange={(e) => props.onKjPer100gChange(e.target.value)}
              className="input mt-1"
              placeholder="包装袋上的数值，如 1200"
              required
            />
            <p className="mt-1 text-xs text-muted">
              按包装标注自动换算：kcal = (g ÷ 100) × (kJ/100g ÷ {KJ_PER_KCAL})
            </p>
          </label>
          {props.packageKcal != null && props.packageKcal > 0 && (
            <p className="log-package-kcal-hint px-3 py-2 text-sm">
              约 <span className="font-semibold tabular-nums">{props.packageKcal}</span>{' '}
              kcal
            </p>
          )}
        </>
      )}

      {props.error && <p className="text-sm text-red-400">{props.error}</p>}

      <button
        type="submit"
        disabled={props.loading}
        className="w-full rounded-xl bg-brand-dark py-3 font-medium disabled:opacity-50"
      >
        {props.loading ? '保存中…' : '保存'}
      </button>
    </form>
  )
}

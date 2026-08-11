import { useMemo, useState } from 'react'
import { kcalFromGramsAndKjPer100g } from '../lib/calories'
import { mealMacroDraft, type MacroDraft, type MacroField } from '../lib/macroTargets'

export type MealInputMode = 'kcal' | 'package'

export function useLogForm(isExercise: boolean) {
  const [name, setName] = useState('')
  const [kcal, setKcal] = useState('')
  const [mealInputMode, setMealInputMode] = useState<MealInputMode>('package')
  const [grams, setGrams] = useState('')
  const [kjPer100g, setKjPer100g] = useState('')
  const [macroDraft, setMacroDraft] = useState<MacroDraft>(() => mealMacroDraft())

  const packageKcal = useMemo(() => {
    const g = parseFloat(grams)
    const kj = parseFloat(kjPer100g)
    if (!g || !kj || g <= 0 || kj <= 0) return null
    return kcalFromGramsAndKjPer100g(g, kj)
  }, [grams, kjPer100g])

  const applyTemplate = (nextName: string, nextKcal: number) => {
    setName(nextName)
    setKcal(String(nextKcal))
    if (!isExercise) setMealInputMode('kcal')
  }

  const applyAiEstimatedKcal = (value: number) => {
    setKcal(String(value))
    if (!isExercise) setMealInputMode('kcal')
  }

  const resolveKcal = (): number | null => {
    if (isExercise || mealInputMode === 'kcal') {
      const parsed = parseFloat(kcal)
      return parsed > 0 ? parsed : null
    }
    return packageKcal
  }

  const setMacroField = (field: MacroField, value: string) => {
    setMacroDraft((current) => ({ ...current, [field]: value }))
  }

  return {
    name,
    setName,
    kcal,
    setKcal,
    mealInputMode,
    setMealInputMode,
    grams,
    setGrams,
    kjPer100g,
    setKjPer100g,
    packageKcal,
    applyTemplate,
    applyAiEstimatedKcal,
    resolveKcal,
    macroDraft,
    setMacroField,
  }
}

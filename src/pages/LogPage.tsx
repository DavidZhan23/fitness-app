import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { TemplatePicker } from '../components/TemplatePicker'
import { useAuth } from '../context/AuthContext'
import {
  addExercise,
  addMeal,
  getOrCreateDayLog,
} from '../lib/dayLogService'
import { formatDateKey } from '../lib/streaks'
import { httpData } from '../lib/api'
import {
  DEFAULT_EXERCISE_TEMPLATES,
  DEFAULT_MEAL_TEMPLATES,
} from '../lib/defaultTemplates'
import { kcalFromGramsAndKjPer100g, KJ_PER_KCAL } from '../lib/calories'

type MealInputMode = 'kcal' | 'package'

export function LogPage() {
  const { type } = useParams<{ type: 'exercise' | 'meal' }>()
  const isExercise = type === 'exercise'
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [kcal, setKcal] = useState('')
  const [mealInputMode, setMealInputMode] = useState<MealInputMode>('kcal')
  const [grams, setGrams] = useState('')
  const [kjPer100g, setKjPer100g] = useState('')
  const [templates, setTemplates] = useState<{ id?: string; name: string; kcal: number }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const packageKcal = useMemo(() => {
    const g = parseFloat(grams)
    const kj = parseFloat(kjPer100g)
    if (!g || !kj || g <= 0 || kj <= 0) return null
    return kcalFromGramsAndKjPer100g(g, kj)
  }, [grams, kjPer100g])

  useEffect(() => {
    if (!user) return
    const type = isExercise ? 'exercise' : 'meal'
    const loadTemplates = async () => {
      const data = await httpData.listTemplates(type)
      setTemplates(
        data.length > 0
          ? data
          : isExercise
            ? DEFAULT_EXERCISE_TEMPLATES
            : DEFAULT_MEAL_TEMPLATES,
      )
    }
    loadTemplates()
  }, [user, isExercise])

  const handleTemplate = (n: string, k: number) => {
    setName(n)
    setKcal(String(k))
    if (!isExercise) setMealInputMode('kcal')
  }

  const resolveKcal = (): number | null => {
    if (isExercise || mealInputMode === 'kcal') {
      const k = parseFloat(kcal)
      return k > 0 ? k : null
    }
    return packageKcal
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !profile) return
    const k = resolveKcal()
    if (!name.trim() || k == null || k <= 0) {
      setError(
        isExercise || mealInputMode === 'kcal'
          ? '请填写名称和有效热量'
          : '请填写名称、克数与千焦/100g',
      )
      return
    }
    setLoading(true)
    setError('')
    try {
      const today = formatDateKey()
      const dayLog = await getOrCreateDayLog(
        user.id,
        today,
        profile.tdee ?? 0,
      )
      if (isExercise) {
        await addExercise(user.id, dayLog.id, name.trim(), k)
      } else {
        await addMeal(user.id, dayLog.id, name.trim(), k)
      }
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-standalone">
      <div className="mx-auto max-w-lg space-y-6 px-4 py-4">
      <div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-sm text-muted hover:text-slate-200"
        >
          ← 返回
        </button>
        <h1 className="mt-2 text-xl font-bold">
          {isExercise ? '记运动' : '记饮食'}
        </h1>
      </div>

      <TemplatePicker templates={templates} onSelect={handleTemplate} />

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="text-sm text-muted">名称</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input mt-1"
            placeholder={isExercise ? '例如：跑步' : '例如：鸡胸肉'}
            required
          />
        </label>

        {!isExercise && (
          <div
            role="group"
            aria-label="热量输入方式"
            className="flex rounded-lg bg-slate-800/60 p-1 text-sm"
          >
            <button
              type="button"
              onClick={() => setMealInputMode('kcal')}
              className={`flex-1 rounded-md py-2 transition ${
                mealInputMode === 'kcal'
                  ? 'bg-slate-700 font-medium text-slate-100'
                  : 'text-muted hover:text-slate-200'
              }`}
            >
              直接输入 kcal
            </button>
            <button
              type="button"
              onClick={() => setMealInputMode('package')}
              className={`flex-1 rounded-md py-2 transition ${
                mealInputMode === 'package'
                  ? 'bg-slate-700 font-medium text-slate-100'
                  : 'text-muted hover:text-slate-200'
              }`}
            >
              包装标注 (g + kJ)
            </button>
          </div>
        )}

        {isExercise || mealInputMode === 'kcal' ? (
          <label className="block">
            <span className="text-sm text-muted">热量 (kcal)</span>
            <input
              type="number"
              min="0"
              step="1"
              value={kcal}
              onChange={(e) => setKcal(e.target.value)}
              className="input mt-1"
              placeholder="300"
              required={isExercise || mealInputMode === 'kcal'}
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
                value={grams}
                onChange={(e) => setGrams(e.target.value)}
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
                value={kjPer100g}
                onChange={(e) => setKjPer100g(e.target.value)}
                className="input mt-1"
                placeholder="包装袋上的数值，如 1200"
                required
              />
              <p className="mt-1 text-xs text-muted">
                按包装标注自动换算：kcal = (g ÷ 100) × (kJ/100g ÷ {KJ_PER_KCAL})
              </p>
            </label>
            {packageKcal != null && packageKcal > 0 && (
              <p className="rounded-lg bg-amber-900/20 px-3 py-2 text-sm text-amber-200/90">
                约 <span className="font-semibold tabular-nums">{packageKcal}</span>{' '}
                kcal
              </p>
            )}
          </>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-brand-dark py-3 font-medium disabled:opacity-50"
        >
          {loading ? '保存中…' : '保存'}
        </button>
      </form>
      </div>
    </div>
  )
}

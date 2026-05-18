import { useEffect, useState } from 'react'
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
import { isSelfHosted } from '../lib/config'
import { supabase } from '../lib/supabase'
import {
  DEFAULT_EXERCISE_TEMPLATES,
  DEFAULT_MEAL_TEMPLATES,
} from '../lib/defaultTemplates'

export function LogPage() {
  const { type } = useParams<{ type: 'exercise' | 'meal' }>()
  const isExercise = type === 'exercise'
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [kcal, setKcal] = useState('')
  const [templates, setTemplates] = useState<{ id?: string; name: string; kcal: number }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    const type = isExercise ? 'exercise' : 'meal'
    const loadTemplates = async () => {
      if (isSelfHosted) {
        const data = await httpData.listTemplates(type)
        setTemplates(
          data.length > 0
            ? data
            : isExercise
              ? DEFAULT_EXERCISE_TEMPLATES
              : DEFAULT_MEAL_TEMPLATES,
        )
        return
      }
      const table = isExercise ? 'exercise_templates' : 'meal_templates'
      const { data } = await supabase
        .from(table)
        .select('id, name, kcal')
        .eq('user_id', user.id)
        .order('name')
      if (data && data.length > 0) {
        setTemplates(data)
      } else {
        setTemplates(
          isExercise ? DEFAULT_EXERCISE_TEMPLATES : DEFAULT_MEAL_TEMPLATES,
        )
      }
    }
    loadTemplates()
  }, [user, isExercise])

  const handleTemplate = (n: string, k: number) => {
    setName(n)
    setKcal(String(k))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !profile) return
    const k = parseFloat(kcal)
    if (!name.trim() || !k || k < 0) {
      setError('请填写名称和有效热量')
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
            required
          />
        </label>

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

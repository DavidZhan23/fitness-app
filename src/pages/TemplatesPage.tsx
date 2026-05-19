import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { httpData } from '../lib/api'
import type { ExerciseTemplate, MealTemplate } from '../types'

export function TemplatesPage() {
  const { user } = useAuth()
  const [exercises, setExercises] = useState<ExerciseTemplate[]>([])
  const [meals, setMeals] = useState<MealTemplate[]>([])
  const [tab, setTab] = useState<'exercise' | 'meal'>('exercise')

  const load = useCallback(async () => {
    if (!user) return
    const [ex, meal] = await Promise.all([
      httpData.listTemplates('exercise'),
      httpData.listTemplates('meal'),
    ])
    setExercises(ex as ExerciseTemplate[])
    setMeals(meal as MealTemplate[])
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  const addTemplate = async () => {
    if (!user) return
    const name = prompt('模板名称')
    if (!name) return
    const kcalStr = prompt('热量 (kcal)')
    const kcal = parseFloat(kcalStr ?? '')
    if (!kcal || kcal < 0) return

    const t = tab === 'exercise' ? 'exercise' : 'meal'
    await httpData.addTemplate(t, name, kcal)
    await load()
  }

  const deleteTemplate = async (id: string) => {
    const t = tab === 'exercise' ? 'exercise' : 'meal'
    await httpData.deleteTemplate(t, id)
    await load()
  }

  const list = tab === 'exercise' ? exercises : meals

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">我的模板</h1>

      <div className="flex gap-2">
        <TabButton active={tab === 'exercise'} onClick={() => setTab('exercise')}>
          运动
        </TabButton>
        <TabButton active={tab === 'meal'} onClick={() => setTab('meal')}>
          饮食
        </TabButton>
      </div>

      <button
        type="button"
        onClick={addTemplate}
        className="w-full rounded-xl border border-dashed border-slate-600 py-2 text-sm text-brand"
      >
        + 添加模板
      </button>

      <ul className="space-y-2">
        {list.map((t) => (
          <li
            key={t.id}
            className="flex items-center justify-between rounded-xl bg-card px-3 py-2.5 ring-1 ring-slate-700/50"
          >
            <div>
              <p className="font-medium">{t.name}</p>
              <p className="text-sm text-muted tabular-nums">{Math.round(t.kcal)} kcal</p>
            </div>
            <button
              type="button"
              onClick={() => deleteTemplate(t.id)}
              className="text-xs text-red-400"
            >
              删除
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg py-2 text-sm font-medium ${
        active ? 'bg-brand-dark text-white' : 'bg-card text-muted'
      }`}
    >
      {children}
    </button>
  )
}

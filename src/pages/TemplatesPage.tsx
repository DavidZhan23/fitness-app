import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { httpData } from '../lib/api'
import type { ExerciseTemplate, MealTemplate } from '../types'

export function TemplatesPage() {
  const { user } = useAuth()
  const [exercises, setExercises] = useState<ExerciseTemplate[]>([])
  const [meals, setMeals] = useState<MealTemplate[]>([])
  const [tab, setTab] = useState<'exercise' | 'meal'>('exercise')
  const [adding, setAdding] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [draftKcal, setDraftKcal] = useState('')
  const [addError, setAddError] = useState('')
  const [saving, setSaving] = useState(false)

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

  const resetAddForm = () => {
    setAdding(false)
    setDraftName('')
    setDraftKcal('')
    setAddError('')
  }

  const submitAdd = async (event: FormEvent) => {
    event.preventDefault()
    if (!user || saving) return

    const name = draftName.trim()
    const kcal = parseFloat(draftKcal)
    if (!name) {
      setAddError('请填写模板名称')
      return
    }
    if (!Number.isFinite(kcal) || kcal < 0) {
      setAddError('请填写有效热量')
      return
    }

    setSaving(true)
    setAddError('')
    try {
      const t = tab === 'exercise' ? 'exercise' : 'meal'
      await httpData.addTemplate(t, name, kcal)
      resetAddForm()
      await load()
    } catch (err) {
      setAddError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const deleteTemplate = async (id: string) => {
    const t = tab === 'exercise' ? 'exercise' : 'meal'
    await httpData.deleteTemplate(t, id)
    await load()
  }

  const list = tab === 'exercise' ? exercises : meals

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-primary">我的模板</h1>

      <div className="flex gap-2" role="tablist" aria-label="模板类型">
        <TabButton
          kind="exercise"
          active={tab === 'exercise'}
          onClick={() => {
            setTab('exercise')
            resetAddForm()
          }}
        >
          运动
        </TabButton>
        <TabButton
          kind="meal"
          active={tab === 'meal'}
          onClick={() => {
            setTab('meal')
            resetAddForm()
          }}
        >
          饮食
        </TabButton>
      </div>

      {adding ? (
        <form
          onSubmit={submitAdd}
          className="surface-card space-y-3 rounded-xl border border-dashed p-3"
          style={{ borderColor: 'var(--template-add-border)' }}
        >
          <p className="text-sm font-medium text-primary">新建{tab === 'exercise' ? '运动' : '饮食'}模板</p>
          <label className="block">
            <span className="text-sm text-muted">名称</span>
            <input
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              className="input mt-1"
              placeholder={tab === 'exercise' ? '跑步' : '午餐'}
              autoFocus
              disabled={saving}
            />
          </label>
          <label className="block">
            <span className="text-sm text-muted">热量 (kcal)</span>
            <input
              type="number"
              min="0"
              step="1"
              value={draftKcal}
              onChange={(e) => setDraftKcal(e.target.value)}
              className="input mt-1"
              placeholder="300"
              disabled={saving}
            />
          </label>
          {addError ? (
            <p className="text-sm text-danger" role="alert">
              {addError}
            </p>
          ) : null}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={resetAddForm}
              disabled={saving}
              className="btn-soft flex-1 rounded-xl py-2 text-sm"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex-1 rounded-xl py-2 text-sm font-medium"
            >
              {saving ? '保存中…' : '保存'}
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="template-add-btn w-full rounded-xl border border-dashed py-2 text-sm"
        >
          + 添加模板
        </button>
      )}

      <ul className="space-y-2">
        {list.map((t) => (
          <li
            key={t.id}
            className="surface-card flex items-center justify-between rounded-xl px-3 py-2.5"
          >
            <div>
              <p className="font-medium">{t.name}</p>
              <p className="text-sm text-muted tabular-nums">{Math.round(t.kcal)} kcal</p>
            </div>
            <button
              type="button"
              onClick={() => deleteTemplate(t.id)}
              className="text-danger text-xs"
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
  kind,
  active,
  onClick,
  children,
}: {
  kind: 'exercise' | 'meal'
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`template-tab flex-1 rounded-lg py-2 text-sm font-medium ${
        active
          ? kind === 'exercise'
            ? 'template-tab--active-exercise'
            : 'template-tab--active-meal'
          : 'template-tab--inactive'
      }`}
    >
      {children}
    </button>
  )
}

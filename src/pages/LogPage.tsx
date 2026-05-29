import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { TemplatePicker } from '../components/TemplatePicker'
import { FluidText, PageShell } from '../components/ui/responsive'
import { useAuth } from '../context/AuthContext'
import { LogEntryForm } from '../features/log/LogEntryForm'
import { submitLog } from '../features/log/submitLog'
import { useAiEstimateFallbackTracker } from '../hooks/useAiEstimateFallbackTracker'
import { useLogForm } from '../hooks/useLogForm'
import { useLogTemplates } from '../hooks/useLogTemplates'

export function LogPage() {
  const { type } = useParams<{ type: 'exercise' | 'meal' }>()
  const isExercise = type === 'exercise'
  const kind = isExercise ? 'exercise' : 'meal'
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const form = useLogForm(isExercise)
  const aiFallbackTracker = useAiEstimateFallbackTracker()
  const templates = useLogTemplates(user?.id, kind, isExercise)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !profile) return

    const kcalValue = form.resolveKcal()
    if (!form.name.trim() || kcalValue == null || kcalValue <= 0) {
      setError(
        isExercise || form.mealInputMode === 'kcal'
          ? '请填写名称和有效热量'
          : '请填写名称、克数与千焦/100g',
      )
      return
    }

    setLoading(true)
    setError('')
    try {
      await submitLog({
        userId: user.id,
        profileTdee: profile.tdee,
        kind,
        name: form.name.trim(),
        kcal: kcalValue,
      })
      aiFallbackTracker.recordSavedIfPending(kind)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-standalone" data-log-kind={kind}>
      <PageShell variant="standalone">
        <div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-sm text-secondary hover:text-primary"
          >
            ← 返回
          </button>
          <FluidText as="h1" variant="title" className="mt-2 text-xl font-bold">
            {isExercise ? '记运动' : '记饮食'}
          </FluidText>
        </div>

        <TemplatePicker
          templates={templates}
          onSelect={(nextName, nextKcal) => {
            form.applyTemplate(nextName, nextKcal)
            aiFallbackTracker.markTemplateInput()
          }}
        />

        <LogEntryForm
          kind={kind}
          isExercise={isExercise}
          loading={loading}
          error={error}
          name={form.name}
          onNameChange={form.setName}
          kcal={form.kcal}
          onKcalChange={(value) => {
            form.setKcal(value)
            aiFallbackTracker.markManualInput()
          }}
          mealInputMode={form.mealInputMode}
          onMealInputModeChange={form.setMealInputMode}
          grams={form.grams}
          onGramsChange={(value) => {
            form.setGrams(value)
            aiFallbackTracker.markManualInput()
          }}
          kjPer100g={form.kjPer100g}
          onKjPer100gChange={(value) => {
            form.setKjPer100g(value)
            aiFallbackTracker.markManualInput()
          }}
          packageKcal={form.packageKcal}
          onEstimated={(value) => {
            form.applyAiEstimatedKcal(value)
            setError('')
          }}
          onAiOutcome={aiFallbackTracker.markAiOutcome}
          onSubmit={handleSubmit}
        />
      </PageShell>
    </div>
  )
}

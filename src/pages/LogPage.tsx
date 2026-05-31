import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { LogModePanel } from '../components/LogModeTabs'
import { PendingLogDraftsSection } from '../components/PendingLogDraftsSection'
import { TemplateEntryCard } from '../components/TemplateEntryCard'
import { TemplateMultiPicker, TemplateSectionHeader } from '../components/TemplateMultiPicker'
import { PageShell } from '../components/ui/responsive'
import { useAuth } from '../context/AuthContext'
import {
  AiLogSection,
  type AiEstimateItemState,
} from '../features/log/AiLogSection'
import { SecondaryManualLogSection } from '../features/log/SecondaryManualLogSection'
import {
  BatchSavePartialError,
  submitLog,
  submitLogsBatch,
} from '../features/log/submitLog'
import { useAiEstimateFallbackTracker } from '../hooks/useAiEstimateFallbackTracker'
import { useLogForm } from '../hooks/useLogForm'
import { useLogTemplates } from '../hooks/useLogTemplates'
import { usePendingLogDrafts } from '../hooks/usePendingLogDrafts'
import { httpData } from '../lib/api'
import {
  aiItemsToLogPayload,
  buildTemplateFromLogItem,
  formatTemplateSaveNotice,
  saveTemplatesFromItems,
  templateKey,
  validateAiItems,
} from '../lib/logTemplate'

const PAGE_TITLE: Record<'exercise' | 'meal', string> = {
  meal: '小满记饮食',
  exercise: '小满记运动',
}

export function LogPage() {
  const { type } = useParams<{ type: 'exercise' | 'meal' }>()
  const isExercise = type === 'exercise'
  const kind = isExercise ? 'exercise' : 'meal'
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isTemplateMode = searchParams.get('mode') === 'templates'
  const form = useLogForm(isExercise)
  const aiFallbackTracker = useAiEstimateFallbackTracker()
  const templates = useLogTemplates(user?.id, kind, isExercise)
  const pendingDrafts = usePendingLogDrafts()
  const pendingSectionRef = useRef<HTMLElement>(null)
  const [highlightPending, setHighlightPending] = useState(false)
  const highlightTimerRef = useRef<number | null>(null)

  const [batchSaving, setBatchSaving] = useState(false)
  const [aiSaving, setAiSaving] = useState(false)
  const [manualSaving, setManualSaving] = useState(false)
  const [batchError, setBatchError] = useState('')
  const [templateAddError, setTemplateAddError] = useState('')
  const [manualError, setManualError] = useState('')
  const [manualNotice, setManualNotice] = useState('')

  const anySaving = batchSaving || aiSaving || manualSaving

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current != null) {
        window.clearTimeout(highlightTimerRef.current)
      }
    }
  }, [])

  const handleTemplateToggle = (template: (typeof templates)[number]) => {
    const wasSelected = pendingDrafts.selectedKeys.has(templateKey(template))
    const err = pendingDrafts.toggleTemplate(template)
    if (err) {
      setTemplateAddError(err)
      return
    }
    setTemplateAddError('')
    if (!wasSelected) {
      setHighlightPending(true)
      if (highlightTimerRef.current != null) {
        window.clearTimeout(highlightTimerRef.current)
      }
      highlightTimerRef.current = window.setTimeout(() => {
        setHighlightPending(false)
        highlightTimerRef.current = null
      }, 1800)
      requestAnimationFrame(() => {
        pendingSectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        })
      })
    }
  }

  const handleConfirmSave = async () => {
    if (!user || !profile || pendingDrafts.drafts.length === 0) return

    const result = pendingDrafts.toSubmitItems()
    if (!result.ok) {
      setBatchError(result.error)
      return
    }

    setBatchSaving(true)
    setBatchError('')
    try {
      await submitLogsBatch({
        userId: user.id,
        profileTdee: profile.tdee,
        kind,
        items: result.items,
      })
      pendingDrafts.clear()
      navigate('/')
    } catch (err) {
      if (err instanceof BatchSavePartialError) {
        setBatchError(err.message)
      } else {
        setBatchError(err instanceof Error ? err.message : '保存失败')
      }
    } finally {
      setBatchSaving(false)
    }
  }

  const saveLogsFromAiItems = async (items: AiEstimateItemState[]) => {
    if (!user || !profile) throw new Error('未登录')

    const validated = validateAiItems(items)
    if (!validated.ok) {
      throw new Error(validated.error)
    }

    const logItems = aiItemsToLogPayload(validated.items)
    if (logItems.length === 1) {
      await submitLog({
        userId: user.id,
        profileTdee: profile.tdee,
        kind,
        name: logItems[0].name,
        kcal: logItems[0].kcal,
      })
    } else {
      await submitLogsBatch({
        userId: user.id,
        profileTdee: profile.tdee,
        kind,
        items: logItems,
      })
    }

    aiFallbackTracker.recordSavedIfPending(kind)

    const templateSeeds = validated.items
      .map((item, index) =>
        items[index]?.saveAsTemplate
          ? buildTemplateFromLogItem({
              name: item.name,
              quantity: item.quantity,
              unit: item.unit,
              kcal: item.kcal,
            })
          : null,
      )
      .filter((item): item is NonNullable<typeof item> => item != null)

    if (templateSeeds.length > 0) {
      const templateResult = await saveTemplatesFromItems({
        existingTemplates: templates,
        items: templateSeeds,
        addTemplate: (payload) => httpData.addTemplate(kind, payload),
      })
      return formatTemplateSaveNotice(templateResult)
    }

    return null
  }

  const handleAiSave = async (items: AiEstimateItemState[]) => {
    setAiSaving(true)
    try {
      await saveLogsFromAiItems(items)
      navigate('/')
      return null
    } finally {
      setAiSaving(false)
    }
  }

  const handleManualSubmitLog = async (name: string, kcal: number) => {
    if (!user || !profile) throw new Error('未登录')
    await submitLog({
      userId: user.id,
      profileTdee: profile.tdee,
      kind,
      name,
      kcal,
    })
  }

  const handleManualComplete = () => {
    navigate('/')
  }

  const openTemplatesMode = () => {
    navigate(`/log/${kind}?mode=templates`)
  }

  const backFromTemplatesMode = () => {
    navigate(`/log/${kind}`)
  }

  return (
    <div className="page-standalone" data-log-kind={kind}>
      <PageShell variant="standalone" className="log-page-shell">
        <header className="log-page-header">
          <button
            type="button"
            onClick={() =>
              isTemplateMode ? backFromTemplatesMode() : navigate('/')
            }
            className="log-pill-btn log-page-back"
          >
            ← 返回
          </button>
          <h1 className="log-page-title">
            {isTemplateMode ? '小满快捷记' : PAGE_TITLE[kind]}
          </h1>
        </header>

        {isTemplateMode ? (
          <LogModePanel mode="templates">
            <section aria-label="常用模板" className="log-template-region">
              <TemplateSectionHeader manageTab={kind} kind={kind} />
              <TemplateMultiPicker
                templates={templates}
                selectedKeys={pendingDrafts.selectedKeys}
                onToggle={handleTemplateToggle}
              />
              {templateAddError ? (
                <p className="mt-2 text-sm text-red-400">{templateAddError}</p>
              ) : null}
            </section>

            <PendingLogDraftsSection
              drafts={pendingDrafts.drafts}
              saving={batchSaving}
              hasInvalidQuantity={pendingDrafts.hasInvalidQuantity}
              error={batchError}
              highlight={highlightPending}
              sectionRef={pendingSectionRef}
              onQuantityChange={(key, value) => {
                pendingDrafts.setQuantityInput(key, value)
                setBatchError('')
              }}
              onRemove={pendingDrafts.removeDraft}
              onConfirmSave={() => void handleConfirmSave()}
            />
          </LogModePanel>
        ) : (
          <LogModePanel mode="ai">
            <div className="log-page-ai-stack">
              <AiLogSection
                kind={kind}
                saving={aiSaving}
                disabled={anySaving && !aiSaving}
                onSave={handleAiSave}
                onAiOutcome={aiFallbackTracker.markAiOutcome}
              />

              <TemplateEntryCard
                kind={kind}
                templates={templates}
                onOpenAll={openTemplatesMode}
              />

              <SecondaryManualLogSection
                isExercise={isExercise}
                kind={kind}
                templates={templates}
                loading={manualSaving}
                error={manualError}
                notice={manualNotice}
                name={form.name}
                onNameChange={form.setName}
                kcal={form.kcal}
                onKcalChange={form.setKcal}
                mealInputMode={form.mealInputMode}
                onMealInputModeChange={form.setMealInputMode}
                grams={form.grams}
                onGramsChange={form.setGrams}
                kjPer100g={form.kjPer100g}
                onKjPer100gChange={form.setKjPer100g}
                packageKcal={form.packageKcal}
                resolveKcal={form.resolveKcal}
                onSubmitLog={handleManualSubmitLog}
                onComplete={handleManualComplete}
                addTemplate={(payload) => httpData.addTemplate(kind, payload)}
                onNotice={setManualNotice}
                onError={setManualError}
                onSubmittingChange={setManualSaving}
              />
            </div>
          </LogModePanel>
        )}
      </PageShell>
    </div>
  )
}

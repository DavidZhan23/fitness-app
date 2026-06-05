import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { LogModePanel } from '../components/LogModeTabs'
import { PendingLogDraftsSection } from '../components/PendingLogDraftsSection'
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

type LogTabMode = 'ai' | 'templates' | 'manual'
type LogSlideDirection = 'forward' | 'backward'
type SwipeAxis = 'pending' | 'horizontal' | 'vertical'

const LOG_TAB_ORDER: LogTabMode[] = ['ai', 'manual', 'templates']

function normalizeMode(value: string | null): LogTabMode {
  if (value === 'templates' || value === 'manual' || value === 'ai') {
    return value
  }
  return 'ai'
}

export function LogPage() {
  const { type } = useParams<{ type: 'exercise' | 'meal' }>()
  const isExercise = type === 'exercise'
  const kind = isExercise ? 'exercise' : 'meal'
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [activeMode, setActiveMode] = useState<LogTabMode>(() =>
    normalizeMode(searchParams.get('mode')),
  )
  const form = useLogForm(isExercise)
  const aiFallbackTracker = useAiEstimateFallbackTracker()
  const templates = useLogTemplates(user?.id, kind, isExercise)
  const pendingDrafts = usePendingLogDrafts()
  const pendingSectionRef = useRef<HTMLElement>(null)
  const [highlightPending, setHighlightPending] = useState(false)
  const highlightTimerRef = useRef<number | null>(null)
  const templateRegionRef = useRef<HTMLElement>(null)
  const templateHighlightTimerRef = useRef<number | null>(null)
  const [highlightTemplateRegion, setHighlightTemplateRegion] = useState(false)

  const [batchSaving, setBatchSaving] = useState(false)
  const [aiSaving, setAiSaving] = useState(false)
  const [manualSaving, setManualSaving] = useState(false)
  const [batchError, setBatchError] = useState('')
  const [templateAddError, setTemplateAddError] = useState('')
  const [manualError, setManualError] = useState('')
  const [manualNotice, setManualNotice] = useState('')

  const anySaving = batchSaving || aiSaving || manualSaving
  const touchStartXRef = useRef<number | null>(null)
  const touchStartYRef = useRef<number | null>(null)
  const touchStartAtRef = useRef<number | null>(null)
  const swipeAxisRef = useRef<SwipeAxis | null>(null)
  const [slideDirection, setSlideDirection] = useState<LogSlideDirection>('forward')
  const [dragOffsetPx, setDragOffsetPx] = useState(0)
  const tabTitles = useMemo(
    () => ({
      ai: 'AI记录',
      manual: isExercise ? '手动录入' : '营养表录入',
      templates: '模板记录',
    }),
    [isExercise],
  )
  useEffect(() => {
    return () => {
      if (highlightTimerRef.current != null) {
        window.clearTimeout(highlightTimerRef.current)
      }
      if (templateHighlightTimerRef.current != null) {
        window.clearTimeout(templateHighlightTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    setActiveMode(normalizeMode(searchParams.get('mode')))
  }, [searchParams])

  useEffect(() => {
    if (activeMode !== 'templates') return
    requestAnimationFrame(() => {
      templateRegionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
    setHighlightTemplateRegion(true)
    if (templateHighlightTimerRef.current != null) {
      window.clearTimeout(templateHighlightTimerRef.current)
    }
    templateHighlightTimerRef.current = window.setTimeout(() => {
      setHighlightTemplateRegion(false)
      templateHighlightTimerRef.current = null
    }, 900)
  }, [activeMode])

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

  const switchMode = (mode: LogTabMode) => {
    if (mode === activeMode) return
    const currentIndex = LOG_TAB_ORDER.indexOf(activeMode)
    const nextIndex = LOG_TAB_ORDER.indexOf(mode)
    setSlideDirection(nextIndex >= currentIndex ? 'forward' : 'backward')
    setDragOffsetPx(0)
    setActiveMode(mode)
  }

  const handleSwipeStart = (clientX: number, clientY: number) => {
    touchStartXRef.current = clientX
    touchStartYRef.current = clientY
    touchStartAtRef.current = performance.now()
    swipeAxisRef.current = 'pending'
  }

  const applyDragResistance = (deltaX: number) => {
    const currentIndex = LOG_TAB_ORDER.indexOf(activeMode)
    const atFirst = currentIndex === 0
    const atLast = currentIndex === LOG_TAB_ORDER.length - 1
    const towardBlockedEdge = (atFirst && deltaX > 0) || (atLast && deltaX < 0)
    const factor = towardBlockedEdge ? 0.28 : 0.55
    const resisted = deltaX * factor
    return Math.max(-120, Math.min(120, resisted))
  }

  const handleSwipeMove = (clientX: number, clientY: number) => {
    const startX = touchStartXRef.current
    const startY = touchStartYRef.current
    if (startX == null || startY == null || swipeAxisRef.current == null) return

    const deltaX = clientX - startX
    const deltaY = clientY - startY

    if (swipeAxisRef.current === 'pending') {
      const absX = Math.abs(deltaX)
      const absY = Math.abs(deltaY)
      if (absX < 6 && absY < 6) return
      swipeAxisRef.current = absX > absY ? 'horizontal' : 'vertical'
    }

    if (swipeAxisRef.current !== 'horizontal') return
    setDragOffsetPx(applyDragResistance(deltaX))
  }

  const handleSwipeEnd = (clientX: number) => {
    const startX = touchStartXRef.current
    const startAt = touchStartAtRef.current
    const axis = swipeAxisRef.current
    touchStartXRef.current = null
    touchStartYRef.current = null
    touchStartAtRef.current = null
    swipeAxisRef.current = null
    if (startX == null || axis !== 'horizontal') {
      setDragOffsetPx(0)
      return
    }
    const deltaX = clientX - startX
    const elapsedMs = startAt == null ? Number.POSITIVE_INFINITY : performance.now() - startAt
    const width = window.innerWidth || 390
    const distanceThreshold = Math.max(18, Math.min(40, width * 0.075))
    const quickSwipeThreshold = 12
    const isQuickSwipe = elapsedMs <= 280 && Math.abs(deltaX) >= quickSwipeThreshold
    setDragOffsetPx(0)
    if (Math.abs(deltaX) < distanceThreshold && !isQuickSwipe) return
    const currentIndex = LOG_TAB_ORDER.indexOf(activeMode)
    if (deltaX < 0 && currentIndex < LOG_TAB_ORDER.length - 1) {
      setSlideDirection('forward')
      setActiveMode(LOG_TAB_ORDER[currentIndex + 1])
    }
    if (deltaX > 0 && currentIndex > 0) {
      setSlideDirection('backward')
      setActiveMode(LOG_TAB_ORDER[currentIndex - 1])
    }
  }

  const isDraggingHorizontally =
    swipeAxisRef.current === 'horizontal' && Math.abs(dragOffsetPx) > 0
  const panelInlineStyle =
    dragOffsetPx === 0
      ? undefined
      : ({ transform: `translate3d(${dragOffsetPx}px, 0, 0)` } as const)
  const swipePanelClass = `log-mode-swipe-panel log-mode-swipe-panel--${slideDirection}${isDraggingHorizontally ? ' log-mode-swipe-panel--dragging' : ''}`

  return (
    <div className="page-standalone" data-log-kind={kind}>
      <PageShell variant="standalone" className="log-page-shell">
        <header className="log-page-header">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="log-pill-btn log-page-back"
          >
            ← 返回
          </button>
          <h1 className="log-page-title">{PAGE_TITLE[kind]}</h1>
        </header>

        <nav className="log-tab-switcher" aria-label="记录方式切换">
          {LOG_TAB_ORDER.map((mode) => (
            <button
              key={mode}
              type="button"
              className={`log-tab-switcher__item${activeMode === mode ? ' log-tab-switcher__item--active' : ''}`}
              aria-pressed={activeMode === mode}
              onClick={() => switchMode(mode)}
            >
              {tabTitles[mode]}
            </button>
          ))}
        </nav>

        <div
          className="log-mode-swipe-area"
          onTouchStart={(event) =>
            handleSwipeStart(
              event.touches[0]?.clientX ?? 0,
              event.touches[0]?.clientY ?? 0,
            )}
          onTouchMove={(event) => {
            handleSwipeMove(
              event.touches[0]?.clientX ?? 0,
              event.touches[0]?.clientY ?? 0,
            )
            if (swipeAxisRef.current === 'horizontal') {
              event.preventDefault()
            }
          }}
          onTouchEnd={(event) => handleSwipeEnd(event.changedTouches[0]?.clientX ?? 0)}
          onTouchCancel={() => handleSwipeEnd(touchStartXRef.current ?? 0)}
        >
          <div
            key={`ai-panel-${kind}`}
            hidden={activeMode !== 'ai'}
            aria-hidden={activeMode !== 'ai'}
            className={activeMode === 'ai' ? swipePanelClass : 'log-mode-swipe-panel'}
            style={activeMode === 'ai' ? panelInlineStyle : undefined}
          >
            <LogModePanel mode="ai">
              <AiLogSection
                key={kind}
                kind={kind}
                description={form.name}
                onDescriptionChange={form.setName}
                saving={aiSaving}
                disabled={anySaving && !aiSaving}
                onSave={handleAiSave}
                onAiOutcome={aiFallbackTracker.markAiOutcome}
              />
            </LogModePanel>
          </div>

          {activeMode === 'templates' ? (
            <div
              key="templates-panel"
              className={swipePanelClass}
              style={panelInlineStyle}
            >
              <LogModePanel mode="templates">
                <section
                  ref={templateRegionRef}
                  aria-label="常用模板"
                  className={`log-template-region${
                    highlightTemplateRegion
                      ? ' log-template-region--intro-highlight'
                      : ''
                  }`}
                >
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
            </div>
          ) : activeMode === 'manual' ? (
            <div
              key="manual-panel"
              className={swipePanelClass}
              style={panelInlineStyle}
            >
              <LogModePanel mode="manual">
                <SecondaryManualLogSection
                  isExercise={isExercise}
                  kind={kind}
                  showNameField
                  collapsible={false}
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
              </LogModePanel>
            </div>
          ) : null}
        </div>
      </PageShell>
    </div>
  )
}

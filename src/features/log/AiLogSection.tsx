import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
} from 'react'
import { httpData } from '../../lib/api'
import {
  CONFIDENCE_LABELS,
  FALLBACK_REASON,
  normalizeConfidence,
  resolveReason,
  type AiEstimateConfidence,
} from '../../lib/aiEstimateDisplay'
import {
  formatApproxKcal,
  formatQtyForDisplay,
  toFinitePositive,
  validateAiItems,
} from '../../lib/logTemplate'
import { trackMetric } from '../../lib/telemetry'
import { fileToMealPhotoDataUrl } from '../../lib/mealPhotoImage'
import { MEAL_PHOTO_GUIDE_TIPS } from '../../lib/mealPhotoGuide'
import {
  isMealPhotoQuotaExhausted,
  type MealPhotoQuota,
} from '../../lib/mealPhotoQuota'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { RecordDeleteButton } from '../../components/RecordActionIcons'

type PendingDeleteItem = { id: string; name: string }

type PhotoPickerSource = 'camera' | 'gallery' | 'file'

type SelectedPhoto = {
  id: string
  dataUrl: string
}

interface SpeechRecognitionEventLike {
  resultIndex: number
  results: {
    length: number
    [index: number]: {
      0?: { transcript?: string }
      isFinal?: boolean
    }
  }
}

interface SpeechRecognitionErrorEventLike {
  error?: string
}

interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onstart: (() => void) | null
  onend: (() => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

export interface AiEstimateItemState {
  id: string
  name: string
  quantityInput: string
  unit: string
  kcalInput: string
  confidence: AiEstimateConfidence
  reason: string
  saveAsTemplate: boolean
}

function VoiceIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5 10v4h3l4 4V6L8 10H5Z" />
      <path d="M15 9.2a4 4 0 0 1 0 5.6" />
      <path d="M17.7 6.5a8 8 0 0 1 0 11" />
    </svg>
  )
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M8.5 6.5 10 4h4l1.5 2.5H19a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8.5a2 2 0 0 1 2-2h3.5Z" />
      <circle cx="12" cy="13" r="3.25" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  )
}

function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m7 15 3-3 3 3 2-2 3 3" />
      <circle cx="8" cy="9" r="1.4" />
    </svg>
  )
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7.5Z" />
    </svg>
  )
}

interface AiLogSectionProps {
  kind: 'exercise' | 'meal'
  description: string
  onDescriptionChange: (value: string) => void
  saving: boolean
  onSave: (items: AiEstimateItemState[]) => Promise<string | null>
  onAiOutcome?: (outcome: 'success' | 'timeout' | 'error') => void
  disabled?: boolean
  showDescriptionInput?: boolean
}

function classifyErrorType(err: unknown): 'network' | 'error' {
  if (err instanceof TypeError) return 'network'
  if (err instanceof Error && /无法连接|网络|network/i.test(err.message)) {
    return 'network'
  }
  return 'error'
}

function readMealPhotoQuotaFromError(err: unknown): MealPhotoQuota | null {
  if (!err || typeof err !== 'object') return null
  const maybeQuota = (err as { mealPhotoQuota?: unknown }).mealPhotoQuota
  if (!maybeQuota || typeof maybeQuota !== 'object') return null
  const quota = maybeQuota as Partial<MealPhotoQuota>
  if (
    typeof quota.limit === 'number' &&
    typeof quota.used === 'number' &&
    typeof quota.unlimited === 'boolean' &&
    typeof quota.dateKey === 'string'
  ) {
    return {
      limit: quota.limit,
      used: quota.used,
      remaining:
        typeof quota.remaining === 'number' || quota.remaining === null
          ? quota.remaining
          : null,
      unlimited: quota.unlimited,
      dateKey: quota.dateKey,
    }
  }
  return null
}

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null
  const maybeWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
  return maybeWindow.SpeechRecognition ?? maybeWindow.webkitSpeechRecognition ?? null
}

function appendTranscript(current: string, transcript: string): string {
  const cleanTranscript = transcript.trim()
  if (!cleanTranscript) return current
  const cleanCurrent = current.trim()
  return cleanCurrent ? `${cleanCurrent} ${cleanTranscript}` : cleanTranscript
}

function createItemId() {
  return `ai-item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function createPhotoId() {
  return `meal-photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function formatItemSummaryMeta(item: AiEstimateItemState): string {
  const qty = toFinitePositive(item.quantityInput)
  const kcal = toFinitePositive(item.kcalInput)
  const qtyText =
    qty != null
      ? formatQtyForDisplay(qty)
      : item.quantityInput.trim() || '—'
  const unit = item.unit.trim() || '—'
  const kcalText = kcal != null ? formatApproxKcal(kcal) : '—'
  return `${qtyText} ${unit} · ${kcalText}`
}

function sumAiItemsKcal(items: AiEstimateItemState[]): number | null {
  let total = 0
  let hasValue = false
  for (const item of items) {
    const kcal = toFinitePositive(item.kcalInput)
    if (kcal == null) continue
    total += kcal
    hasValue = true
  }
  return hasValue ? total : null
}

function mapResponseItems(
  description: string,
  kind: 'exercise' | 'meal',
  response: {
    kcal: number
    items?: {
      name: string
      quantity?: number
      unit?: string
      kcal: number
      confidence?: AiEstimateConfidence
      reason?: string
    }[]
  },
): AiEstimateItemState[] {
  const defaultUnit = kind === 'meal' ? '份' : '分钟'

  if (response.items?.length) {
    return response.items.map((item) => {
      const confidence = normalizeConfidence(item.confidence)
      return {
        id: createItemId(),
        name: item.name,
        quantityInput: String(item.quantity ?? 1),
        unit: item.unit?.trim() || defaultUnit,
        kcalInput: String(item.kcal),
        confidence,
        reason: resolveReason(item.reason, confidence),
        saveAsTemplate: false,
      }
    })
  }

  return [
    {
      id: createItemId(),
      name: description,
      quantityInput: '1',
      unit: defaultUnit,
      kcalInput: String(response.kcal),
      confidence: 'medium',
      reason: FALLBACK_REASON,
      saveAsTemplate: false,
    },
  ]
}

export function AiLogSection({
  kind,
  description,
  onDescriptionChange,
  saving,
  onSave,
  onAiOutcome,
  disabled,
  showDescriptionInput = true,
}: AiLogSectionProps) {
  const textInputRef = useRef<HTMLTextAreaElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const [items, setItems] = useState<AiEstimateItemState[]>([])
  const [expandedItemIds, setExpandedItemIds] = useState<Record<string, boolean>>({})
  const [estimating, setEstimating] = useState(false)
  const [estimateError, setEstimateError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [hasEstimate, setHasEstimate] = useState(false)
  const [photos, setPhotos] = useState<SelectedPhoto[]>([])
  const [photoError, setPhotoError] = useState('')
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false)
  const [photoGuideOpen, setPhotoGuideOpen] = useState(false)
  const [photoLoading, setPhotoLoading] = useState(false)
  const [photoQuota, setPhotoQuota] = useState<MealPhotoQuota | null>(null)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const [speechError, setSpeechError] = useState('')
  const [pendingDelete, setPendingDelete] = useState<PendingDeleteItem | null>(
    null,
  )

  const isExercise = kind === 'exercise'
  const isMeal = kind === 'meal'
  const sectionTitle = isExercise ? '做了什么运动？' : '吃了什么？'
  const sectionHint = isExercise
    ? '描述运动和时长即可；AI 只估运动额外消耗，不含基础代谢。'
    : '不用精确到克数，像聊天一样描述也可以。'
  const fuzzyHint = isExercise
    ? '支持模糊输入：像聊天一样写，比如“晚饭后散步一会儿”。'
    : '支持模糊输入，也可以上传图片 / 拍照后补充描述。'
  const placeholder = '发消息或点语音说话...'

  const busy = disabled || saving || estimating || photoLoading
  const photoQuotaBlocked = isMealPhotoQuotaExhausted(photoQuota)

  const resetEstimateState = () => {
    setEstimateError('')
    setHasEstimate(false)
    setItems([])
    setExpandedItemIds({})
  }

  const loadPhotoQuota = useCallback(async () => {
    if (!isMeal) return
    try {
      setPhotoQuota(await httpData.getMealPhotoQuota())
    } catch {
      setPhotoQuota(null)
    }
  }, [isMeal])

  useEffect(() => {
    if (!isMeal) return
    void loadPhotoQuota()
  }, [isMeal, loadPhotoQuota])

  const resizeTextInput = useCallback(() => {
    const node = textInputRef.current
    if (!node) return
    node.style.height = 'auto'
    node.style.height = `${Math.min(node.scrollHeight, 180)}px`
  }, [])

  useEffect(() => {
    resizeTextInput()
  }, [description, resizeTextInput])

  useEffect(() => {
    setSpeechSupported(getSpeechRecognitionConstructor() != null)
    return () => {
      recognitionRef.current?.abort()
      recognitionRef.current = null
    }
  }, [])

  const applyEstimateResponse = (
    response: {
      kcal: number
      items?: {
        name: string
        quantity?: number
        unit?: string
        kcal: number
        confidence?: AiEstimateConfidence
        reason?: string
      }[]
    },
    labelFallback: string,
  ) => {
    const nextItems = mapResponseItems(labelFallback, kind, response)
    setItems(nextItems)
    setExpandedItemIds({})
    setHasEstimate(true)
  }

  const trackEstimateMetric = (
    name: 'ai_estimate_success' | 'ai_estimate_timeout' | 'ai_estimate_error',
    durationMs: number,
    inputMode: 'ai' | 'photo',
    inputLength: number,
    errorType?: 'timeout' | 'network' | 'error',
  ) => {
    if (name === 'ai_estimate_success') {
      onAiOutcome?.('success')
      trackMetric({
        name,
        durationMs,
        metadata: {
          kind,
          input_mode: inputMode,
          input_length: inputLength,
          duration_ms: durationMs,
          status: 'ok',
        },
      })
      return
    }

    if (name === 'ai_estimate_timeout') {
      onAiOutcome?.('timeout')
      trackMetric({
        name,
        durationMs,
        metadata: {
          kind,
          input_mode: inputMode,
          input_length: inputLength,
          duration_ms: durationMs,
          status: 'timeout',
          error_type: 'timeout',
        },
      })
      return
    }

    onAiOutcome?.('error')
    trackMetric({
      name,
      durationMs,
      metadata: {
        kind,
        input_mode: inputMode,
        input_length: inputLength,
        duration_ms: durationMs,
        status: 'error',
        error_type: errorType ?? 'error',
      },
    })
  }

  const runEstimate = async (
    estimateFn: (signal: AbortSignal) => Promise<{
      kcal: number
      items?: {
        name: string
        quantity?: number
        unit?: string
        kcal: number
        confidence?: AiEstimateConfidence
        reason?: string
      }[]
    }>,
    labelFallback: string,
    inputMode: 'ai' | 'photo',
    inputLength: number,
  ) => {
    setEstimating(true)
    resetEstimateState()

    const started = performance.now()
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), 45_000)

    try {
      const response = await estimateFn(controller.signal)
      applyEstimateResponse(response, labelFallback)
      trackEstimateMetric(
        'ai_estimate_success',
        Math.round(performance.now() - started),
        inputMode,
        inputLength,
      )
    } catch (err) {
      const durationMs = Math.round(performance.now() - started)
      if (err instanceof Error && err.name === 'AbortError') {
        setEstimateError(
          inputMode === 'photo' ? '识别超时，请稍后重试' : '估算超时，请稍后重试',
        )
        trackEstimateMetric('ai_estimate_timeout', durationMs, inputMode, inputLength)
      } else {
        const quotaFromError = readMealPhotoQuotaFromError(err)
        if (quotaFromError) {
          setPhotoQuota(quotaFromError)
        }
        setEstimateError(err instanceof Error ? err.message : '估算失败')
        trackEstimateMetric(
          'ai_estimate_error',
          durationMs,
          inputMode,
          inputLength,
          classifyErrorType(err),
        )
      }
    } finally {
      window.clearTimeout(timeoutId)
      setEstimating(false)
    }
  }

  const updateItem = (
    id: string,
    patch: Partial<AiEstimateItemState>,
  ) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    )
  }

  const toggleItemExpanded = (id: string) => {
    setExpandedItemIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const requestRemoveItem = (id: string, name: string) => {
    setPendingDelete({ id, name: name.trim() || '未命名' })
  }

  const confirmRemoveItem = () => {
    if (!pendingDelete) return
    const { id } = pendingDelete
    setItems((prev) => prev.filter((item) => item.id !== id))
    setExpandedItemIds((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    setSaveError('')
    setPendingDelete(null)
  }

  const totalKcal = sumAiItemsKcal(items)

  const toggleSpeechInput = () => {
    if (busy) return
    if (!speechSupported) {
      setSpeechError('当前浏览器不支持语音输入，可以先用键盘输入。')
      return
    }
    if (listening) {
      recognitionRef.current?.stop()
      return
    }

    const Recognition = getSpeechRecognitionConstructor()
    if (!Recognition) {
      setSpeechError('当前浏览器不支持语音输入，可以先用键盘输入。')
      setSpeechSupported(false)
      return
    }

    const recognition = new Recognition()
    recognition.lang = 'zh-CN'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onstart = () => {
      setListening(true)
      setSpeechError('')
      setEstimateError('')
    }
    recognition.onend = () => {
      setListening(false)
    }
    recognition.onerror = (event) => {
      setListening(false)
      setSpeechError(
        event.error === 'not-allowed'
          ? '没有麦克风权限，请允许后再试。'
          : '语音识别失败，请再试一次。',
      )
    }
    recognition.onresult = (event) => {
      let transcript = ''
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        transcript += event.results[index]?.[0]?.transcript ?? ''
      }
      const nextDescription = appendTranscript(description, transcript)
      onDescriptionChange(nextDescription)
      setEstimateError('')
      setSpeechError('')
      window.requestAnimationFrame(resizeTextInput)
    }
    recognitionRef.current = recognition
    try {
      recognition.start()
    } catch {
      setListening(false)
      setSpeechError('语音输入启动失败，请再试一次。')
    }
  }

  const triggerPhotoPicker = (source: PhotoPickerSource) => {
    if (!isMeal || busy) return
    if (photoQuotaBlocked) {
      setPhotoError('今日拍照识别次数已用完，请明天再试')
      setPhotoMenuOpen(false)
      return
    }
    setPhotoMenuOpen(false)
    setPhotoError('')
    if (source === 'camera') {
      cameraInputRef.current?.click()
    } else if (source === 'gallery') {
      galleryInputRef.current?.click()
    } else {
      fileInputRef.current?.click()
    }
  }

  const appendPhotoFiles = async (files: File[]) => {
    if (files.length === 0) return
    if (!isMeal) return
    if (photoQuotaBlocked) {
      setPhotoError('今日拍照识别次数已用完，请明天再试')
      return
    }
    setPhotoLoading(true)
    try {
      const nextPhotos = await Promise.all(
        files.map(async (file) => ({
          id: createPhotoId(),
          dataUrl: await fileToMealPhotoDataUrl(file),
        })),
      )
      setPhotos((prev) => [...prev, ...nextPhotos])
      setPhotoError('')
      resetEstimateState()
      setSaveError('')
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : '图片读取失败，请换一张试试')
    } finally {
      setPhotoLoading(false)
    }
  }

  const handlePhotoFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    await appendPhotoFiles(files)
  }

  const handleInputPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    if (!isMeal || busy) return
    const files = Array.from(event.clipboardData.files ?? []).filter((file) =>
      file.type.startsWith('image/'),
    )
    if (files.length === 0) return
    event.preventDefault()
    void appendPhotoFiles(files)
  }

  const removeSelectedPhoto = (id: string) => {
    setPhotos((prev) => prev.filter((photo) => photo.id !== id))
    setPhotoError('')
    setPhotoMenuOpen(false)
    resetEstimateState()
    setSaveError('')
  }

  const handleEstimate = async () => {
    const desc = description.trim()
    const imageDataUrls = photos.map((photo) => photo.dataUrl)
    const hasPhotoInput = isMeal && imageDataUrls.length > 0
    if (!hasPhotoInput && desc.length < 2) {
      setEstimateError(
        isMeal
          ? '请先输入内容或上传图片（可补充分量，估算更准）'
          : '请先输入内容（可含时长、分量，估算更准）',
      )
      return
    }
    if (hasPhotoInput && photoQuotaBlocked) {
      setEstimateError('')
      setPhotoError('今日拍照识别次数已用完，请明天再试')
      return
    }

    await runEstimate(
      (signal) =>
        httpData.estimateKcal(kind, desc, {
          signal,
          imageDataUrls: hasPhotoInput ? imageDataUrls : undefined,
        }),
      desc || (imageDataUrls.length > 1 ? '多张餐食照片' : '餐食照片'),
      hasPhotoInput ? 'photo' : 'ai',
      desc.length + imageDataUrls.length,
    )
    if (hasPhotoInput) {
      void loadPhotoQuota()
    }
  }

  const handleSave = async () => {
    if (items.length === 0) {
      setSaveError('至少保留一条记录，或删除后重新估算')
      return
    }
    const validated = validateAiItems(items)
    if (validated.ok === false) {
      setSaveError(validated.error)
      return
    }
    setSaveError('')
    try {
      const notice = await onSave(items)
      if (notice) {
        // Parent navigates away; notice is best-effort before navigate
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '保存失败')
    }
  }

  return (
    <>
      <ConfirmDialog
        open={pendingDelete != null}
        title="删除这条估算结果？"
        message={
          pendingDelete
            ? `「${pendingDelete.name}」将从本次估算中移除，确定要继续吗？`
            : ''
        }
        confirmLabel="确定删除"
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmRemoveItem}
      />
    <section aria-label="AI 估算" className="log-ai-section">
      <div className="log-ai-card px-4 py-4">
        <header className="log-ai-card__header">
          <h2 className="log-section-title">{sectionTitle}</h2>
          <p className="log-ai-card__hint">{sectionHint}</p>
        </header>

        <>
          <div className={`log-ai-unified-input${photoMenuOpen ? ' log-ai-unified-input--menu-open' : ''}`}>
            {showDescriptionInput ? (
              <div className="log-ai-composer" role="group" aria-label="AI 输入">
                <button
                  type="button"
                  className={`log-ai-composer__icon-btn log-ai-composer__voice-btn${listening ? ' log-ai-composer__icon-btn--active' : ''}`}
                  aria-label={listening ? '停止语音输入' : '语音输入'}
                  aria-pressed={listening}
                  disabled={busy}
                  onClick={toggleSpeechInput}
                >
                  <VoiceIcon />
                </button>

                <textarea
                  ref={textInputRef}
                  rows={1}
                  value={description}
                  onChange={(e) => {
                    onDescriptionChange(e.target.value)
                    setEstimateError('')
                    setPhotoError('')
                    setSpeechError('')
                    window.requestAnimationFrame(resizeTextInput)
                  }}
                  onPaste={handleInputPaste}
                  disabled={busy}
                  className="log-ai-composer__textarea"
                  placeholder={placeholder}
                  aria-label={sectionTitle}
                />

                {isMeal ? (
                  <div className="log-ai-composer__actions">
                    <button
                      type="button"
                      className="log-ai-composer__icon-btn"
                      aria-label="拍照"
                      disabled={busy || photoQuotaBlocked}
                      onClick={() => triggerPhotoPicker('camera')}
                    >
                      <CameraIcon />
                    </button>
                    <button
                      type="button"
                      className={`log-ai-composer__icon-btn${photoMenuOpen ? ' log-ai-composer__icon-btn--active' : ''}`}
                      aria-label={photoMenuOpen ? '收起图片菜单' : '展开图片菜单'}
                      aria-expanded={photoMenuOpen}
                      aria-haspopup="menu"
                      disabled={busy || photoQuotaBlocked}
                      onClick={() => {
                        setPhotoMenuOpen((open) => !open)
                        setPhotoError('')
                      }}
                    >
                      {photoMenuOpen ? <CloseIcon /> : <PlusIcon />}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="log-ai-card__hint">{fuzzyHint}</p>
            )}

            {isMeal ? (
              <>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  onChange={(event) => void handlePhotoFileChange(event)}
                  disabled={busy || photoQuotaBlocked}
                />
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={(event) => void handlePhotoFileChange(event)}
                  disabled={busy || photoQuotaBlocked}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={(event) => void handlePhotoFileChange(event)}
                  disabled={busy || photoQuotaBlocked}
                />

                {photoMenuOpen ? (
                  <div className="log-ai-composer-menu" role="menu">
                    <button
                      type="button"
                      role="menuitem"
                      className="log-ai-composer-menu__item"
                      onClick={() => triggerPhotoPicker('camera')}
                    >
                      <CameraIcon />
                      <span>拍照</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="log-ai-composer-menu__item"
                      onClick={() => triggerPhotoPicker('gallery')}
                    >
                      <ImageIcon />
                      <span>相册</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="log-ai-composer-menu__item"
                      onClick={() => triggerPhotoPicker('file')}
                    >
                      <FolderIcon />
                      <span>本地文件</span>
                    </button>
                    <button
                      type="button"
                      className="log-ai-composer-menu__hint"
                      aria-expanded={photoGuideOpen}
                      onClick={() => setPhotoGuideOpen((open) => !open)}
                    >
                      {photoGuideOpen ? '收起拍摄提示' : '拍摄小提示'}
                    </button>
                  </div>
                ) : null}

                {photos.length > 0 ? (
                  <div className="log-ai-photo-preview-list">
                    {photos.map((photo, index) => (
                      <div className="log-ai-photo-preview" key={photo.id}>
                        <img
                          src={photo.dataUrl}
                          alt={`已选择的饮食图片 ${index + 1}`}
                          className="log-ai-photo-preview__image"
                        />
                        <div className="log-ai-photo-preview__copy">
                          <strong>图片 {index + 1}</strong>
                          <span>可继续补充「小碗」「少油」等说明。</span>
                        </div>
                        <div className="log-ai-photo-preview__actions">
                          <button
                            type="button"
                            className="log-ai-photo-preview__remove"
                            disabled={busy}
                            onClick={() => removeSelectedPhoto(photo.id)}
                            aria-label={`删除第 ${index + 1} 张图片`}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="log-ai-photo-preview__link"
                      disabled={busy || photoQuotaBlocked}
                      onClick={() => {
                        setPhotoMenuOpen(true)
                        setPhotoError('')
                      }}
                    >
                      继续添加 / 重新选择
                    </button>
                  </div>
                ) : null}

                {photoGuideOpen ? (
                  <div className="log-ai-photo-guide" aria-label="拍摄小提示">
                    <ul className="log-ai-photo-guide__list">
                      {MEAL_PHOTO_GUIDE_TIPS.map((tip) => (
                        <li key={tip.id} className="log-ai-photo-guide__item">
                          <strong>{tip.title}</strong>
                          <span>{tip.body}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>

          <p className="log-ai-fuzzy-hint">{fuzzyHint}</p>

          <button
            type="button"
            disabled={busy}
            onClick={() => void handleEstimate()}
            className="log-ai-btn w-full py-3 text-sm font-medium disabled:opacity-50"
          >
            AI 估算热量
          </button>

          {estimating ? (
            <p className="log-ai-estimating-status" role="status">
              估算中…
            </p>
          ) : null}
          {speechError ? <p className="text-xs text-red-400">{speechError}</p> : null}
          {photoError ? <p className="text-xs text-red-400">{photoError}</p> : null}
          {estimateError ? (
            <p className="text-xs text-red-400">{estimateError}</p>
          ) : null}
        </>

        {hasEstimate ? (
          <section aria-label="AI 估算结果" className="log-ai-results">
            <header className="log-ai-results__header">
              <div className="log-ai-results__heading">
                <h3 className="log-ai-results__title">AI 估算结果</h3>
                {items.length > 0 ? (
                  <p className="log-ai-results__stats tabular-nums">
                    <span>{items.length} 条</span>
                    {totalKcal != null ? (
                      <>
                        <span className="log-ai-results__stats-sep" aria-hidden>
                          ·
                        </span>
                        <span>合计约 {Math.round(totalKcal)} kcal</span>
                      </>
                    ) : null}
                  </p>
                ) : null}
              </div>
              <p className="log-ai-results__hint">
                {items.length > 0
                  ? '识别有误的可直接删除该条；保留正确的再保存。'
                  : '已全部移除。可重新估算，或返回修改描述。'}
              </p>
            </header>

            {items.length > 0 ? (
              <div className="log-ai-results__list">
                {items.map((item) => {
                  const expanded = Boolean(expandedItemIds[item.id])
                  const itemLabel = item.name.trim() || '未命名'

                  return (
                    <article
                      key={item.id}
                      className={`log-ai-item-card${expanded ? ' log-ai-item-card--expanded' : ''}`}
                    >
                      <div className="log-ai-item-card__summary">
                        <div className="log-ai-item-card__summary-main">
                          <strong className="log-ai-item-card__title">
                            {itemLabel}
                          </strong>
                          <span className="log-ai-item-card__meta tabular-nums">
                            {formatItemSummaryMeta(item)}
                          </span>
                        </div>
                        <div className="log-ai-item-card__actions">
                          <span
                            className={`log-ai-confidence log-ai-confidence--${item.confidence}`}
                          >
                            {CONFIDENCE_LABELS[item.confidence]}
                          </span>
                          <div className="log-ai-item-card__action-buttons">
                            <button
                              type="button"
                              className="log-ai-item-card__details-btn"
                              aria-expanded={expanded}
                              onClick={() => toggleItemExpanded(item.id)}
                            >
                              {expanded ? '收起' : '调整'}
                            </button>
                            <RecordDeleteButton
                              label={`删除 ${itemLabel}`}
                              disabled={busy}
                              className="log-ai-item-card__delete-btn"
                              onClick={() => requestRemoveItem(item.id, itemLabel)}
                            />
                          </div>
                        </div>
                      </div>

                      {expanded ? (
                        <div className="log-ai-item-card__details">
                          <p className="log-ai-item-card__reason">
                            AI 估算依据：{item.reason}
                          </p>

                          <div className="log-ai-item-card__edit">
                            <p className="log-ai-item-card__edit-hint">
                              可以在保存前调整名称、份量、单位和热量。
                            </p>

                            <div className="log-ai-item-card__fields">
                              <label className="log-ai-item-card__field log-ai-item-card__field--name">
                                <span className="log-ai-item-card__field-label">名称</span>
                                <input
                                  value={item.name}
                                  onChange={(e) =>
                                    updateItem(item.id, { name: e.target.value })
                                  }
                                  disabled={busy}
                                  className="input w-full min-w-0"
                                  aria-label="名称"
                                />
                              </label>
                              <div className="log-ai-item-card__field-row log-ai-item-card__field-row--metrics">
                                <label className="log-ai-item-card__field">
                                  <span className="log-ai-item-card__field-label">
                                    数量
                                  </span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={item.quantityInput}
                                    onChange={(e) =>
                                      updateItem(item.id, {
                                        quantityInput: e.target.value,
                                      })
                                    }
                                    disabled={busy}
                                    className="input w-full min-w-0 tabular-nums"
                                    aria-label={`${itemLabel} 数量`}
                                  />
                                </label>
                                <label className="log-ai-item-card__field">
                                  <span className="log-ai-item-card__field-label">
                                    单位
                                  </span>
                                  <input
                                    value={item.unit}
                                    onChange={(e) =>
                                      updateItem(item.id, { unit: e.target.value })
                                    }
                                    disabled={busy}
                                    className="input w-full min-w-0"
                                    aria-label={`${itemLabel} 单位`}
                                  />
                                </label>
                                <label className="log-ai-item-card__field">
                                  <span className="log-ai-item-card__field-label">
                                    热量 (kcal)
                                  </span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={item.kcalInput}
                                    onChange={(e) =>
                                      updateItem(item.id, { kcalInput: e.target.value })
                                    }
                                    disabled={busy}
                                    className="input w-full min-w-0 tabular-nums"
                                    aria-label={`${itemLabel} 热量`}
                                  />
                                </label>
                              </div>
                            </div>
                          </div>

                          <label className="log-ai-item-card__template-option">
                            <input
                              type="checkbox"
                              aria-label="保存为快捷模板"
                              checked={item.saveAsTemplate}
                              onChange={(e) =>
                                updateItem(item.id, {
                                  saveAsTemplate: e.target.checked,
                                })
                              }
                              disabled={busy}
                            />
                            <span className="log-ai-item-card__template-copy">
                              <strong className="log-ai-item-card__template-title">
                                保存为快捷模板
                              </strong>
                              <span className="log-ai-item-card__template-desc">
                                下次可直接点选，系统会按数量自动计算热量。
                              </span>
                            </span>
                          </label>

                          {item.confidence === 'low' && item.saveAsTemplate ? (
                            <p className="log-ai-item-card__template-warning">
                              份量较模糊，保存为模板前建议确认单位和数量。
                            </p>
                          ) : null}

                          <button
                            type="button"
                            className="log-ai-item-card__remove-link"
                            disabled={busy}
                            onClick={() => requestRemoveItem(item.id, itemLabel)}
                          >
                            移除此条记录
                          </button>
                        </div>
                      ) : null}
                    </article>
                  )
                })}
              </div>
            ) : (
              <div className="log-ai-results__empty">
                <p className="log-ai-results__empty-title">没有要保存的条目了</p>
                <p className="log-ai-results__empty-hint">
                  可以重新拍照或输入描述，再次估算。
                </p>
              </div>
            )}

            <footer className="log-ai-results__footer">
              {saveError ? (
                <p className="text-sm text-red-400">{saveError}</p>
              ) : null}
              <button
                type="button"
                disabled={busy || items.length === 0}
                onClick={() => void handleSave()}
                className="btn-primary w-full py-3 disabled:opacity-50"
              >
                {saving
                  ? '保存中…'
                  : items.length === 0
                    ? '请先保留至少一条'
                    : `保存 ${items.length} 条记录`}
              </button>
            </footer>
          </section>
        ) : null}
      </div>
    </section>
    </>
  )
}

import { useCallback, useEffect, useId, useRef, useState, type ChangeEvent } from 'react'
import { httpData } from '../../lib/api'
import {
  dismissMealPhotoGuide,
  isMealPhotoGuideOpen,
  MEAL_PHOTO_CAPTURE_HINT,
  MEAL_PHOTO_GUIDE_TIPS,
  MEAL_PHOTO_SECTION_HINT,
} from '../../lib/mealPhotoGuide'
import { fileToMealPhotoDataUrl } from '../../lib/mealPhotoImage'
import {
  isMealPhotoQuotaExhausted,
  type MealPhotoQuota,
} from '../../lib/mealPhotoQuota'
import { MealPhotoQuotaBadge } from './MealPhotoQuotaBadge'

interface MealPhotoSectionProps {
  disabled?: boolean
  estimating?: boolean
  onEstimate: (payload: {
    imageDataUrl: string
    supplement: string
  }) => void | Promise<void>
  estimateError?: string
}

function readQuotaFromError(err: unknown): MealPhotoQuota | null {
  if (!err || typeof err !== 'object') return null
  const quota = (err as { mealPhotoQuota?: MealPhotoQuota }).mealPhotoQuota
  if (!quota || typeof quota !== 'object') return null
  return quota
}

export function MealPhotoSection({
  disabled = false,
  estimating = false,
  onEstimate,
  estimateError = '',
}: MealPhotoSectionProps) {
  const cameraInputId = useId()
  const galleryInputId = useId()
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const [guideOpen, setGuideOpen] = useState(() => isMealPhotoGuideOpen())
  const [previewUrl, setPreviewUrl] = useState('')
  const [imageDataUrl, setImageDataUrl] = useState('')
  const [supplement, setSupplement] = useState('')
  const [photoError, setPhotoError] = useState('')
  const [loadingPhoto, setLoadingPhoto] = useState(false)
  const [quota, setQuota] = useState<MealPhotoQuota | null>(null)
  const [quotaLoading, setQuotaLoading] = useState(true)

  const quotaBlocked = isMealPhotoQuotaExhausted(quota)
  const busy = disabled || estimating || loadingPhoto

  const loadQuota = useCallback(async () => {
    setQuotaLoading(true)
    try {
      const next = await httpData.getMealPhotoQuota()
      setQuota(next)
    } catch {
      /* 额度加载失败不阻断选图，识别时服务端仍会校验 */
    } finally {
      setQuotaLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadQuota()
  }, [loadQuota])

  const dismissGuide = () => {
    setGuideOpen(false)
    dismissMealPhotoGuide()
  }

  const openGuide = () => {
    setGuideOpen(true)
  }

  const openCameraPicker = () => {
    if (busy || quotaBlocked) return
    cameraInputRef.current?.click()
  }

  const openGalleryPicker = () => {
    if (busy || quotaBlocked) return
    galleryInputRef.current?.click()
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (quotaBlocked) {
      setPhotoError('今日拍照识别次数已用完，请明天再试')
      return
    }

    setPhotoError('')
    setLoadingPhoto(true)
    try {
      const dataUrl = await fileToMealPhotoDataUrl(file)
      setImageDataUrl(dataUrl)
      setPreviewUrl(dataUrl)
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : '无法处理照片')
      setImageDataUrl('')
      setPreviewUrl('')
    } finally {
      setLoadingPhoto(false)
    }
  }

  const handleEstimate = async () => {
    if (quotaBlocked) {
      setPhotoError('今日拍照识别次数已用完，请明天再试')
      return
    }
    if (!imageDataUrl) {
      setPhotoError('请先拍摄或从相册选择一张餐食照片')
      return
    }
    setPhotoError('')
    try {
      await onEstimate({ imageDataUrl, supplement: supplement.trim() })
    } catch (err) {
      const quotaFromError = readQuotaFromError(err)
      if (quotaFromError) setQuota(quotaFromError)
    } finally {
      await loadQuota()
    }
  }

  const handleRetake = () => {
    setPreviewUrl('')
    setImageDataUrl('')
    setPhotoError('')
  }

  return (
    <div className="meal-photo-section">
      <MealPhotoQuotaBadge quota={quota} loading={quotaLoading} />

      <p className="log-ai-card__hint">{MEAL_PHOTO_SECTION_HINT}</p>

      {quotaBlocked ? (
        <p className="meal-photo-quota-empty-hint">
          今日 {quota?.limit ?? 30} 次拍照识别已用完。你可以改用「文字描述」记录饮食，或明天再试。
        </p>
      ) : null}

      {guideOpen ? (
        <section className="meal-photo-guide" aria-label="拍摄指引">
          <header className="meal-photo-guide__header">
            <h3 className="meal-photo-guide__title">拍摄指引</h3>
            <button
              type="button"
              className="meal-photo-guide__dismiss"
              onClick={dismissGuide}
            >
              知道了
            </button>
          </header>
          <ul className="meal-photo-guide__list">
            {MEAL_PHOTO_GUIDE_TIPS.map((tip) => (
              <li key={tip.id} className="meal-photo-guide__item">
                <strong className="meal-photo-guide__item-title">{tip.title}</strong>
                <p className="meal-photo-guide__item-body">{tip.body}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <button
          type="button"
          className="meal-photo-guide__reopen"
          onClick={openGuide}
          disabled={busy}
        >
          查看拍摄指引（距离 / 角度 / 光线）
        </button>
      )}

      <div className="meal-photo-capture">
        {previewUrl ? (
          <div className="meal-photo-preview">
            <img
              src={previewUrl}
              alt="待识别的餐食照片预览"
              className="meal-photo-preview__image"
            />
            <p className="meal-photo-preview__hint">{MEAL_PHOTO_CAPTURE_HINT}</p>
            <div className="meal-photo-preview__actions">
              <button
                type="button"
                className="meal-photo-preview__retake"
                onClick={handleRetake}
                disabled={busy || quotaBlocked}
              >
                更换照片
              </button>
            </div>
          </div>
        ) : (
          <div
            className={`meal-photo-picker${quotaBlocked ? ' meal-photo-picker--disabled' : ''}`}
          >
            <p className="meal-photo-picker__hint">{MEAL_PHOTO_CAPTURE_HINT}</p>
            <div className="meal-photo-picker__actions">
              <button
                type="button"
                className="meal-photo-picker__btn meal-photo-picker__btn--camera"
                onClick={openCameraPicker}
                disabled={busy || quotaBlocked}
              >
                <span className="meal-photo-picker__icon" aria-hidden>
                  📷
                </span>
                <span className="meal-photo-picker__label">
                  {loadingPhoto ? '处理中…' : '拍照'}
                </span>
              </button>
              <button
                type="button"
                className="meal-photo-picker__btn meal-photo-picker__btn--gallery"
                onClick={openGalleryPicker}
                disabled={busy || quotaBlocked}
              >
                <span className="meal-photo-picker__icon" aria-hidden>
                  🖼
                </span>
                <span className="meal-photo-picker__label">
                  {loadingPhoto ? '处理中…' : '从相册选择'}
                </span>
              </button>
            </div>
          </div>
        )}

        <input
          ref={cameraInputRef}
          id={cameraInputId}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          disabled={quotaBlocked}
          onChange={(event) => void handleFileChange(event)}
        />
        <input
          ref={galleryInputRef}
          id={galleryInputId}
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={quotaBlocked}
          onChange={(event) => void handleFileChange(event)}
        />
      </div>

      <label className="meal-photo-supplement block">
        <span className="meal-photo-supplement__label">
          补充说明（可选，如「这是小份」「少油」）
        </span>
        <input
          value={supplement}
          onChange={(e) => setSupplement(e.target.value)}
          disabled={busy || quotaBlocked}
          className="input w-full min-w-0"
          placeholder="例如：这是一小碗米饭 + 半份清炒时蔬"
          maxLength={200}
        />
      </label>

      <button
        type="button"
        disabled={busy || !imageDataUrl || quotaBlocked}
        onClick={() => void handleEstimate()}
        className="log-ai-btn w-full py-3 text-sm font-medium disabled:opacity-50"
      >
        {estimating ? '识别中…' : 'AI 识别热量'}
      </button>

      {photoError ? <p className="text-xs text-red-400">{photoError}</p> : null}
      {estimateError ? <p className="text-xs text-red-400">{estimateError}</p> : null}
    </div>
  )
}

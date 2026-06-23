import { useEffect, useRef, useState } from 'react'
import dajiFoxCompanionUrl from '../assets/daji-fox-companion-cutout-768.png'
import dajiFoxCompanionMirroredUrl from '../assets/daji-fox-companion-cutout-768-mirrored.png'
import { httpData, type FoxCompanionSummary } from '../lib/api'
import { FoxInteractionMenu } from './fox/FoxInteractionMenu'
import { FoxSpeechBubble } from './fox/FoxSpeechBubble'
import {
  getLocalFoxResponse,
  getProgressLineCategory,
  getRandomFoxLine,
} from './fox/foxLines'
import type { FoxTrigger } from './fox/foxTypes'
import { validateFoxChatResponse } from './fox/foxTypes'
import { useFoxStateMachine } from './fox/useFoxStateMachine'

interface DajiFoxCompanionProps {
  summary: FoxCompanionSummary
  displayName?: string
  exerciseKcal: number
  exerciseCount: number
  lastWorkoutType?: string
  todayGoalCompleted: boolean
}

const AI_COOLDOWN_MS = 30_000
const LONG_PRESS_MS = 520
const FOX_EXERCISE_PROGRESS_TARGET = 600

function formatDateLabel(dateKey: string) {
  const [, month, day] = dateKey.split('-')
  return `${Number(month)}月${Number(day)}日`
}

function getTimeOfDay() {
  const hour = new Date().getHours()
  if (hour < 6) return 'night' as const
  if (hour < 12) return 'morning' as const
  if (hour < 18) return 'afternoon' as const
  if (hour < 22) return 'evening' as const
  return 'night' as const
}

export function DajiFoxCompanion({
  summary,
  displayName,
  exerciseKcal,
  exerciseCount,
  lastWorkoutType,
  todayGoalCompleted,
}: DajiFoxCompanionProps) {
  const { state, dispatch, showResponse } = useFoxStateMachine(summary.eligible)
  const [loadingText, setLoadingText] = useState('')
  const controllerRef = useRef<AbortController | null>(null)
  const lastAiAtRef = useRef(0)
  const clickTimerRef = useRef<number | null>(null)
  const longPressTimerRef = useRef<number | null>(null)
  const suppressClickRef = useRef(false)
  const previousGoalRef = useRef(todayGoalCompleted)
  const proactiveCountRef = useRef(0)
  const lastScrollAtRef = useRef(0)
  const lastManualDismissAtRef = useRef(0)
  const progress = Math.max(0, exerciseKcal / FOX_EXERCISE_PROGRESS_TARGET)

  useEffect(() => {
    if (!summary.eligible) return
    const timer = window.setTimeout(() => {
      proactiveCountRef.current += 1
      showResponse(getLocalFoxResponse('enter'), 'SHOW_LOCAL')
    }, 1_050)
    return () => window.clearTimeout(timer)
  }, [summary.eligible, showResponse])

  useEffect(() => {
    if (!summary.eligible) return
    const onScroll = () => { lastScrollAtRef.current = Date.now() }
    window.addEventListener('scroll', onScroll, { passive: true })
    const timer = window.setTimeout(() => {
      if (proactiveCountRef.current >= 2) return
      if (Date.now() - lastScrollAtRef.current < 2_000) return
      if (Date.now() - lastManualDismissAtRef.current < 30_000) return
      const hour = new Date().getHours()
      const highActivity = exerciseKcal >= 900
      const eveningPending = hour >= 18 && !todayGoalCompleted
      if (!highActivity && !eveningPending) return
      proactiveCountRef.current += 1
      showResponse(
        getLocalFoxResponse(highActivity ? 'caring' : 'encourage'),
        'SHOW_LOCAL',
      )
    }, 34_000)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.clearTimeout(timer)
    }
  }, [exerciseKcal, showResponse, summary.eligible, todayGoalCompleted])

  useEffect(() => {
    if (summary.eligible && todayGoalCompleted && !previousGoalRef.current) {
      showResponse(getLocalFoxResponse('completed'), 'SHOW_LOCAL')
    }
    previousGoalRef.current = todayGoalCompleted
  }, [showResponse, summary.eligible, todayGoalCompleted])

  useEffect(() => {
    return () => {
      controllerRef.current?.abort()
      if (clickTimerRef.current) window.clearTimeout(clickTimerRef.current)
      if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current)
    }
  }, [])

  if (!summary.eligible) {
    return (
      <section className="fox-unlock-hint" aria-label="小狸尚未现身">
        <span className="fox-unlock-hint__glow" aria-hidden />
        <span className="fox-unlock-hint__prints" aria-hidden>・ ・ ・</span>
        <p>本周成为运动大王后，小狸会现身。</p>
      </section>
    )
  }

  const latestDate = summary.latestChampionDate ?? summary.championDates.at(-1)
  const dateText = latestDate ? formatDateLabel(latestDate) : '本周'

  const requestFox = async (trigger: FoxTrigger, bypassCooldown = false) => {
    if (state.mood === 'thinking') return
    if (!bypassCooldown && Date.now() - lastAiAtRef.current < AI_COOLDOWN_MS) {
      showResponse(getLocalFoxResponse(getProgressLineCategory(progress)), 'SHOW_LOCAL')
      return
    }
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    const timeout = window.setTimeout(() => controller.abort(), 12_000)
    setLoadingText(getRandomFoxLine('aiLoading'))
    dispatch({ type: 'AI_REQUEST' })
    try {
      const raw = await httpData.getFoxEncouragement(
        {
          trigger,
          user: displayName ? { displayName, locale: navigator.language } : undefined,
          fitness: {
            todayExerciseKcal: exerciseKcal,
            todayExerciseCount: exerciseCount,
            todayProgress: Math.min(progress, 2),
            todayGoalCompleted,
            hasSportKingThisWeek: true,
            lastWorkoutType,
          },
          context: {
            timeOfDay: getTimeOfDay(),
            page: 'today',
            appLanguage: navigator.language,
          },
        },
        { signal: controller.signal },
      )
      const response = validateFoxChatResponse(raw)
      lastAiAtRef.current = Date.now()
      if (!response) throw new Error('Invalid fox response')
      showResponse(response)
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError' && controller !== controllerRef.current) return
      showResponse(getLocalFoxResponse('aiError'), 'AI_ERROR')
    } finally {
      window.clearTimeout(timeout)
    }
  }

  const handleClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    if (clickTimerRef.current) window.clearTimeout(clickTimerRef.current)
    clickTimerRef.current = window.setTimeout(() => requestFox('fox_tap'), 240)
  }

  const handleDoubleClick = () => {
    if (clickTimerRef.current) window.clearTimeout(clickTimerRef.current)
    showResponse(getLocalFoxResponse('praise'), 'SHOW_LOCAL')
  }

  const beginLongPress = () => {
    if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current)
    longPressTimerRef.current = window.setTimeout(() => {
      suppressClickRef.current = true
      dispatch({ type: 'TOGGLE_MENU', open: true })
    }, LONG_PRESS_MS)
  }

  const cancelLongPress = () => {
    if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current)
  }

  const bubbleText = state.mood === 'thinking'
    ? loadingText
    : state.response?.text

  return (
    <section
      className={`daji-fox-card daji-fox-card--${state.mood}${state.paused ? ' is-paused' : ''}`}
      aria-label="小狸陪伴舞台"
    >
      <div className="daji-fox-card__copy">
        <p className="daji-fox-card__eyebrow">本周运动大王陪伴</p>
        <h2 className="daji-fox-card__title">小狸在今日页等你</h2>
        <p className="daji-fox-card__desc">
          {dateText}的王冠还亮着，小狸今天也来陪你守住这份漂亮。
        </p>
        <div className="daji-fox-progress" aria-label={`今日运动 ${Math.round(exerciseKcal)} 千卡`}>
          <span>今日运动</span>
          <strong>{Math.round(exerciseKcal)} kcal</strong>
          <i style={{ '--fox-progress': `${Math.min(progress, 1) * 100}%` } as React.CSSProperties} />
        </div>
      </div>

      <div className="daji-fox-stage">
        <span className="daji-fox-stage__moon" aria-hidden />
        <span className="daji-fox-stage__fire daji-fox-stage__fire--one" aria-hidden />
        <span className="daji-fox-stage__fire daji-fox-stage__fire--two" aria-hidden />
        {state.bubbleVisible && bubbleText && (
          <FoxSpeechBubble
            text={bubbleText}
            style={state.mood === 'thinking' ? 'soft' : state.response?.bubbleStyle ?? 'warm'}
            onDismiss={() => {
              lastManualDismissAtRef.current = Date.now()
              dispatch({ type: 'DISMISS_BUBBLE' })
            }}
          />
        )}
        {state.menuVisible && (
          <FoxInteractionMenu onSelect={(trigger) => requestFox(trigger)} />
        )}
        <button
          type="button"
          className={`daji-fox daji-fox--${state.motion}`}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          onPointerDown={beginLongPress}
          onPointerUp={cancelLongPress}
          onPointerCancel={cancelLongPress}
          onPointerLeave={cancelLongPress}
          onContextMenu={(event) => event.preventDefault()}
          aria-label="小狸：点击对话，双击夸奖，长按打开互动"
        >
          <span className="daji-fox__shadow" aria-hidden />
          <span className="daji-fox__sprite daji-fox__sprite--left" aria-hidden>
            <img className="daji-fox__sticker" src={dajiFoxCompanionUrl} alt="" draggable={false} />
          </span>
          <span className="daji-fox__sprite daji-fox__sprite--right" aria-hidden>
            <img className="daji-fox__sticker" src={dajiFoxCompanionMirroredUrl} alt="" draggable={false} />
          </span>
        </button>
      </div>
    </section>
  )
}

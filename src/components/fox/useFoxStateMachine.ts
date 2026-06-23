import { useCallback, useEffect, useReducer, useRef } from 'react'
import type { FoxChatResponse, FoxMood, FoxMotion } from './foxTypes'

type FoxState = {
  mood: FoxMood
  motion: FoxMotion
  response: FoxChatResponse | null
  bubbleVisible: boolean
  menuVisible: boolean
  paused: boolean
}

type FoxEvent =
  | { type: 'PAGE_ENTER'; eligible: boolean }
  | { type: 'ENTERED' }
  | { type: 'IDLE_ACTION'; motion: FoxMotion; mood: FoxMood }
  | { type: 'AI_REQUEST' }
  | { type: 'AI_RESPONSE'; response: FoxChatResponse }
  | { type: 'AI_ERROR'; response: FoxChatResponse }
  | { type: 'SHOW_LOCAL'; response: FoxChatResponse }
  | { type: 'TOGGLE_MENU'; open?: boolean }
  | { type: 'DISMISS_BUBBLE' }
  | { type: 'APP_BACKGROUND' }
  | { type: 'APP_FOREGROUND' }

const initialState: FoxState = {
  mood: 'hidden',
  motion: 'idle',
  response: null,
  bubbleVisible: false,
  menuVisible: false,
  paused: false,
}

function reducer(state: FoxState, event: FoxEvent): FoxState {
  switch (event.type) {
    case 'PAGE_ENTER':
      return { ...initialState, mood: event.eligible ? 'entering' : 'hint' }
    case 'ENTERED':
      return { ...state, mood: 'idle', motion: 'greet' }
    case 'IDLE_ACTION':
      if (state.bubbleVisible || state.menuVisible || state.paused) return state
      return { ...state, mood: event.mood, motion: event.motion }
    case 'AI_REQUEST':
      return { ...state, mood: 'thinking', motion: 'look_at', bubbleVisible: true, menuVisible: false }
    case 'AI_RESPONSE':
    case 'AI_ERROR':
    case 'SHOW_LOCAL':
      return {
        ...state,
        mood: event.type === 'AI_ERROR' ? 'error' : event.response.mood,
        motion: event.response.motion,
        response: event.response,
        bubbleVisible: true,
        menuVisible: false,
      }
    case 'TOGGLE_MENU':
      return { ...state, menuVisible: event.open ?? !state.menuVisible, bubbleVisible: false }
    case 'DISMISS_BUBBLE':
      return { ...state, mood: 'idle', motion: 'idle', bubbleVisible: false }
    case 'APP_BACKGROUND':
      return { ...state, paused: true }
    case 'APP_FOREGROUND':
      return { ...state, paused: false }
  }
}

const idleActions: Array<{ motion: FoxMotion; mood: FoxMood }> = [
  { motion: 'tail_sway', mood: 'idle' },
  { motion: 'look_at', mood: 'waiting' },
  { motion: 'sleepy', mood: 'sleepy' },
  { motion: 'tease', mood: 'teasing' },
]

export function useFoxStateMachine(eligible: boolean) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const dismissTimer = useRef<number | null>(null)

  useEffect(() => {
    dispatch({ type: 'PAGE_ENTER', eligible })
    if (!eligible) return
    const timer = window.setTimeout(() => dispatch({ type: 'ENTERED' }), 900)
    return () => window.clearTimeout(timer)
  }, [eligible])

  useEffect(() => {
    if (!eligible || state.paused) return
    const delay = 6_000 + Math.random() * 6_000
    const timer = window.setTimeout(() => {
      const action = idleActions[Math.floor(Math.random() * idleActions.length)] ?? idleActions[0]
      dispatch({ type: 'IDLE_ACTION', ...action })
    }, delay)
    return () => window.clearTimeout(timer)
  }, [eligible, state.mood, state.paused, state.bubbleVisible, state.menuVisible])

  useEffect(() => {
    const onVisibility = () => dispatch({
      type: document.hidden ? 'APP_BACKGROUND' : 'APP_FOREGROUND',
    })
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  const showResponse = useCallback((response: FoxChatResponse, eventType: 'AI_RESPONSE' | 'AI_ERROR' | 'SHOW_LOCAL' = 'AI_RESPONSE') => {
    if (dismissTimer.current) window.clearTimeout(dismissTimer.current)
    dispatch({ type: eventType, response })
    dismissTimer.current = window.setTimeout(
      () => dispatch({ type: 'DISMISS_BUBBLE' }),
      response.duration * 1_000,
    )
  }, [])

  useEffect(() => () => {
    if (dismissTimer.current) window.clearTimeout(dismissTimer.current)
  }, [])

  return { state, dispatch, showResponse }
}

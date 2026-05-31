import { useCallback, useEffect, useRef, useState } from 'react'

export type AutosaveState = 'idle' | 'saving' | 'saved' | 'error'

interface UseBlurAutosaveOptions {
  enabled: boolean
  isEqual: boolean
  save: () => Promise<void>
  successDisplayMs?: number
  validate?: () => string | null
  mapError?: (error: unknown) => string
}

export function useBlurAutosave(options: UseBlurAutosaveOptions) {
  const { successDisplayMs = 3000 } = options
  const [state, setState] = useState<AutosaveState>('idle')
  const [error, setError] = useState('')
  const optionsRef = useRef(options)
  optionsRef.current = options
  const savingRef = useRef(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const commit = useCallback(async () => {
    const { enabled, isEqual, save, validate, mapError } = optionsRef.current
    if (!enabled) return

    if (isEqual) {
      if (mountedRef.current) {
        setState('idle')
        setError('')
      }
      return
    }

    const validationError = validate?.() ?? null
    if (validationError) {
      if (mountedRef.current) {
        setState('idle')
        setError(validationError)
      }
      return
    }

    if (savingRef.current) return
    savingRef.current = true
    if (mountedRef.current) {
      setState('saving')
      setError('')
    }
    try {
      await save()
      if (mountedRef.current) setState('saved')
    } catch (err) {
      if (mountedRef.current) {
        setState('error')
        if (mapError) {
          setError(mapError(err))
        } else {
          setError(err instanceof Error ? err.message : '保存失败')
        }
      }
    } finally {
      savingRef.current = false
    }
  }, [])

  useEffect(() => {
    if (state !== 'saved') return
    const timer = window.setTimeout(() => setState('idle'), successDisplayMs)
    return () => clearTimeout(timer)
  }, [state, successDisplayMs])

  return { state, error, commit }
}

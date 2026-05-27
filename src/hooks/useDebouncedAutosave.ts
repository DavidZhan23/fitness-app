import { useEffect, useState } from 'react'

export type AutosaveState = 'idle' | 'saving' | 'saved' | 'error'

interface UseDebouncedAutosaveOptions {
  enabled: boolean
  isEqual: boolean
  save: () => Promise<void>
  delayMs?: number
  successDisplayMs?: number
  validate?: () => string | null
  mapError?: (error: unknown) => string
}

export function useDebouncedAutosave(options: UseDebouncedAutosaveOptions) {
  const {
    enabled,
    isEqual,
    save,
    delayMs = 450,
    successDisplayMs = 3000,
    validate,
    mapError,
  } = options
  const [state, setState] = useState<AutosaveState>('idle')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!enabled) return

    if (isEqual) {
      setState('idle')
      setError('')
      return
    }

    const validationError = validate?.() ?? null
    if (validationError) {
      setState('idle')
      setError(validationError)
      return
    }

    setState('saving')
    setError('')
    const timer = window.setTimeout(() => {
      void save()
        .then(() => setState('saved'))
        .catch((err) => {
          setState('error')
          if (mapError) {
            setError(mapError(err))
            return
          }
          setError(err instanceof Error ? err.message : '保存失败')
        })
    }, delayMs)

    return () => clearTimeout(timer)
  }, [enabled, isEqual, validate, save, delayMs, mapError])

  useEffect(() => {
    if (state !== 'saved') return
    const timer = window.setTimeout(() => setState('idle'), successDisplayMs)
    return () => clearTimeout(timer)
  }, [state, successDisplayMs])

  return { state, error }
}

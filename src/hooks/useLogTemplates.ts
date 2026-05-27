import { useEffect, useState } from 'react'
import { httpData } from '../lib/api'
import {
  DEFAULT_EXERCISE_TEMPLATES,
  DEFAULT_MEAL_TEMPLATES,
} from '../lib/defaultTemplates'

type Template = { id?: string; name: string; kcal: number }

export function useLogTemplates(
  userId: string | undefined,
  kind: 'exercise' | 'meal',
  isExercise: boolean,
) {
  const [templates, setTemplates] = useState<Template[]>([])

  useEffect(() => {
    if (!userId) return
    const loadTemplates = async () => {
      const data = await httpData.listTemplates(kind)
      setTemplates(
        data.length > 0
          ? data
          : isExercise
            ? DEFAULT_EXERCISE_TEMPLATES
            : DEFAULT_MEAL_TEMPLATES,
      )
    }
    loadTemplates()
  }, [userId, kind, isExercise])

  return templates
}

import { useEffect, useState } from 'react'
import { httpData } from '../lib/api'
import {
  DEFAULT_EXERCISE_TEMPLATES,
  DEFAULT_MEAL_TEMPLATES,
} from '../lib/defaultTemplates'
import { normalizeLogTemplate, sortTemplatesForPicker } from '../lib/logTemplate'
import type { LogTemplate } from '../types'

function defaultsAsLogTemplates(
  kind: 'exercise' | 'meal',
  seeds: typeof DEFAULT_MEAL_TEMPLATES,
): LogTemplate[] {
  return seeds
    .map((seed, index) =>
      normalizeLogTemplate(
        {
          name: seed.name,
          unit: seed.unit,
          kcalPerUnit: seed.kcalPerUnit,
          defaultQuantity: seed.defaultQuantity,
        },
        kind,
        `default-${kind}-${index}`,
      ),
    )
    .filter((t): t is LogTemplate => t != null)
}

export function useLogTemplates(
  userId: string | undefined,
  kind: 'exercise' | 'meal',
  isExercise: boolean,
) {
  const [templates, setTemplates] = useState<LogTemplate[]>([])

  useEffect(() => {
    if (!userId) return
    const loadTemplates = async () => {
      const data = await httpData.listTemplates(kind)
      const normalized = sortTemplatesForPicker(data, kind)
      setTemplates(
        normalized.length > 0
          ? normalized
          : isExercise
            ? defaultsAsLogTemplates('exercise', DEFAULT_EXERCISE_TEMPLATES)
            : defaultsAsLogTemplates('meal', DEFAULT_MEAL_TEMPLATES),
      )
    }
    loadTemplates()
  }, [userId, kind, isExercise])

  return templates
}

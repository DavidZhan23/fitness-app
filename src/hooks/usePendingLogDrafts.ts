import { useCallback, useMemo, useState } from 'react'
import {
  buildDraftRecordName,
  computeDraftKcal,
  templateKey,
  toFinitePositive,
} from '../lib/logTemplate'
import type { LogTemplate } from '../types'

export interface PendingLogDraft {
  key: string
  template: LogTemplate
  quantityInput: string
}

export function usePendingLogDrafts() {
  const [drafts, setDrafts] = useState<PendingLogDraft[]>([])

  const selectedKeys = useMemo(
    () => new Set(drafts.map((draft) => draft.key)),
    [drafts],
  )

  const hasInvalidQuantity = useMemo(
    () =>
      drafts.some(
        (draft) => toFinitePositive(draft.quantityInput) == null,
      ),
    [drafts],
  )

  const toggleTemplate = useCallback((template: LogTemplate): string | null => {
    const key = templateKey(template)
    const defaultQty = toFinitePositive(template.defaultQuantity)
    const rate = toFinitePositive(template.kcalPerUnit)
    if (defaultQty == null || rate == null || !template.unit.trim()) {
      return '模板数据不完整，无法加入待确认记录'
    }

    setDrafts((prev) => {
      const existing = prev.find((draft) => draft.key === key)
      if (existing) {
        return prev.filter((draft) => draft.key !== key)
      }
      return [
        ...prev,
        { key, template, quantityInput: String(defaultQty) },
      ]
    })
    return null
  }, [])

  const removeDraft = useCallback((key: string) => {
    setDrafts((prev) => prev.filter((draft) => draft.key !== key))
  }, [])

  const clear = useCallback(() => {
    setDrafts([])
  }, [])

  const setQuantityInput = useCallback((key: string, value: string) => {
    setDrafts((prev) =>
      prev.map((draft) =>
        draft.key === key ? { ...draft, quantityInput: value } : draft,
      ),
    )
  }, [])

  const toSubmitItems = useCallback(():
    | { ok: true; items: { name: string; kcal: number }[] }
    | { ok: false; error: string } => {
    if (drafts.length === 0) {
      return { ok: false, error: '请先选择模板' }
    }

    const items: { name: string; kcal: number }[] = []
    for (const draft of drafts) {
      const quantity = toFinitePositive(draft.quantityInput)
      const kcal = computeDraftKcal(
        quantity ?? NaN,
        draft.template.kcalPerUnit,
      )
      const name = buildDraftRecordName(
        draft.template.name,
        quantity ?? NaN,
        draft.template.unit,
      )
      if (quantity == null || kcal == null || !name) {
        return { ok: false, error: '请检查数量与热量后再保存' }
      }
      items.push({ name, kcal })
    }
    return { ok: true, items }
  }, [drafts])

  return {
    drafts,
    selectedKeys,
    hasInvalidQuantity,
    toggleTemplate,
    removeDraft,
    clear,
    setQuantityInput,
    toSubmitItems,
  }
}

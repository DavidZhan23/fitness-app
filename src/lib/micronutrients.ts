import type {
  MicronutrientId,
  MicronutrientItem,
  MicronutrientStatus,
  MicronutrientSummary,
} from '../types'

export const MICRONUTRIENT_CATALOG: {
  id: MicronutrientId
  label: string
  group: '维生素' | '矿物质'
}[] = [
  { id: 'vit_a', label: '维生素 A', group: '维生素' },
  { id: 'vit_c', label: '维生素 C', group: '维生素' },
  { id: 'vit_d', label: '维生素 D', group: '维生素' },
  { id: 'vit_e', label: '维生素 E', group: '维生素' },
  { id: 'vit_k', label: '维生素 K', group: '维生素' },
  { id: 'vit_b1', label: '维生素 B1', group: '维生素' },
  { id: 'vit_b2', label: '维生素 B2', group: '维生素' },
  { id: 'vit_b6', label: '维生素 B6', group: '维生素' },
  { id: 'vit_b9', label: '叶酸（B9）', group: '维生素' },
  { id: 'vit_b12', label: '维生素 B12', group: '维生素' },
  { id: 'calcium', label: '钙', group: '矿物质' },
  { id: 'iron', label: '铁', group: '矿物质' },
  { id: 'zinc', label: '锌', group: '矿物质' },
  { id: 'magnesium', label: '镁', group: '矿物质' },
  { id: 'potassium', label: '钾', group: '矿物质' },
  { id: 'iodine', label: '碘', group: '矿物质' },
]

export const MICRONUTRIENT_STATUS_LABELS: Record<MicronutrientStatus, string> = {
  adequate: '可能充足',
  low: '可能不足',
  unknown: '信息不足',
}

const STATUS_ORDER: Record<MicronutrientStatus, number> = {
  low: 0,
  unknown: 1,
  adequate: 2,
}

export function micronutrientItemsForDisplay(
  summary: MicronutrientSummary | null | undefined,
): MicronutrientItem[] {
  const existing = new Map(
    (summary?.items ?? []).map((item) => [item.id, item]),
  )
  return MICRONUTRIENT_CATALOG.map<MicronutrientItem>(({ id }) =>
    existing.get(id) ?? {
      id,
      status: 'unknown' as const,
      note: '',
      food_suggestions: [],
    },
  ).sort((a, b) => {
    const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
    if (statusDiff !== 0) return statusDiff
    return (
      MICRONUTRIENT_CATALOG.findIndex((item) => item.id === a.id) -
      MICRONUTRIENT_CATALOG.findIndex((item) => item.id === b.id)
    )
  })
}

export function micronutrientLabel(id: MicronutrientId): string {
  return MICRONUTRIENT_CATALOG.find((item) => item.id === id)?.label ?? id
}

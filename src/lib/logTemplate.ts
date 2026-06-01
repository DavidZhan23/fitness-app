import type { LogTemplate } from '../types'

export type LogTemplateKind = LogTemplate['kind']

export function toFinitePositive(value: unknown): number | null {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}

export interface RawLogTemplateRow {
  id?: string
  name?: string
  unit?: string | null
  kcal_per_unit?: number | string | null
  kcalPerUnit?: number | string | null
  default_quantity?: number | string | null
  defaultQuantity?: number | string | null
  kcal?: number | string | null
  created_at?: string | null
}

function parseTemplateCreatedAt(value: string | null | undefined): number {
  if (typeof value !== 'string' || !value.trim()) return 0
  const ms = Date.parse(value)
  return Number.isFinite(ms) ? ms : 0
}

/** Align with `.log-template-chip-grid` minmax(8.5rem) for collapse row math. */
export const LOG_TEMPLATE_CHIP_MIN_WIDTH_PX = 136

export function measureTemplateChipColumns(
  containerWidth: number,
  gap: number,
): number {
  if (containerWidth <= 0) return 2
  return Math.max(
    2,
    Math.floor((containerWidth + gap) / (LOG_TEMPLATE_CHIP_MIN_WIDTH_PX + gap)),
  )
}

export function sortTemplatesForPicker(
  rows: RawLogTemplateRow[],
  kind: LogTemplateKind,
): LogTemplate[] {
  const sorted = [...rows].sort(
    (a, b) =>
      parseTemplateCreatedAt(b.created_at) - parseTemplateCreatedAt(a.created_at),
  )
  return sorted
    .map((row) => normalizeLogTemplate(row, kind))
    .filter((t): t is LogTemplate => t != null)
}

export function normalizeLogTemplate(
  raw: RawLogTemplateRow,
  kind: LogTemplateKind,
  fallbackId?: string,
): LogTemplate | null {
  const name = typeof raw.name === 'string' ? raw.name.trim() : ''
  if (!name) return null

  const unitRaw =
    typeof raw.unit === 'string' && raw.unit.trim() ? raw.unit.trim() : null
  const kcalPerUnitRaw = raw.kcal_per_unit ?? raw.kcalPerUnit
  const defaultQuantityRaw = raw.default_quantity ?? raw.defaultQuantity

  let unit = unitRaw
  let kcalPerUnit = toFinitePositive(kcalPerUnitRaw)
  let defaultQuantity = toFinitePositive(defaultQuantityRaw)

  if (!unit || kcalPerUnit == null || defaultQuantity == null) {
    const legacyKcal = toFinitePositive(raw.kcal)
    if (legacyKcal == null) return null
    unit = unit ?? '份'
    kcalPerUnit = kcalPerUnit ?? legacyKcal
    defaultQuantity = defaultQuantity ?? 1
  }

  if (!unit || kcalPerUnit == null || defaultQuantity == null) return null

  const id = raw.id ?? fallbackId ?? `${name}-${kcalPerUnit}-${unit}`
  const legacyKcal = toFinitePositive(raw.kcal)

  return {
    id,
    kind,
    name,
    unit,
    kcalPerUnit,
    defaultQuantity,
    ...(legacyKcal != null ? { kcal: legacyKcal } : {}),
  }
}

export function templateKey(template: Pick<LogTemplate, 'id' | 'name' | 'kcalPerUnit' | 'unit'>) {
  return template.id ?? `${template.name}-${template.kcalPerUnit}-${template.unit}`
}

export function computeDraftKcal(quantity: number, kcalPerUnit: number): number | null {
  const q = toFinitePositive(quantity)
  const rate = toFinitePositive(kcalPerUnit)
  if (q == null || rate == null) return null
  return Math.round(q * rate)
}

export function buildDraftRecordName(
  name: string,
  quantity: number,
  unit: string,
): string {
  const q = toFinitePositive(quantity)
  const trimmedUnit = unit.trim()
  if (!name.trim() || q == null || !trimmedUnit) return ''
  const qtyText = Number.isInteger(q) ? String(q) : String(q)
  return `${name.trim()} ${qtyText}${trimmedUnit}`
}

export function formatApproxKcal(kcal: number | null): string {
  if (kcal == null || !Number.isFinite(kcal)) return '—'
  return `约 ${kcal} kcal`
}

export function formatQtyForDisplay(quantity: number): string {
  if (Number.isInteger(quantity)) return String(quantity)
  const text = String(quantity)
  return text.includes('.') ? text.replace(/\.?0+$/, '') : text
}

export function formatTemplateChipHint(template: LogTemplate): string {
  const qty = toFinitePositive(template.defaultQuantity)
  const rate = toFinitePositive(template.kcalPerUnit)
  if (qty == null || rate == null || !template.unit.trim()) return ''
  const kcal = Math.round(qty * rate)
  if (!Number.isFinite(kcal)) return ''
  return `${formatQtyForDisplay(qty)}${template.unit} ≈ ${kcal} kcal`
}

export function isPreviewableTemplate(template: LogTemplate): boolean {
  return template.name.trim() !== '' && formatTemplateChipHint(template) !== ''
}

export function getPreviewableTemplates(
  templates: LogTemplate[],
  limit = 4,
): LogTemplate[] {
  return templates.filter(isPreviewableTemplate).slice(0, limit)
}

export function formatTemplateListLine(template: LogTemplate): string {
  const qty = toFinitePositive(template.defaultQuantity)
  const rate = toFinitePositive(template.kcalPerUnit)
  if (qty == null || rate == null || !template.unit.trim()) return template.name
  return `${template.name} · 默认 ${qty}${template.unit} · ${rate} kcal/${template.unit}`
}

export interface ParsedNameQuantityUnit {
  name: string
  quantity: number
  unit: string
}

const NAME_QTY_UNIT_RE =
  /^(.+?)\s*(\d+(?:\.\d+)?)\s*(g|ml|个|根|片|碗|分钟|小时|km|m|斤|kg|份|L|l)$/u
const NAME_QTY_UNIT_TIGHT_RE =
  /^(.+?)(\d+(?:\.\d+)?)(g|ml|个|根|片|碗|分钟|小时|km|m|斤|kg|份|L|l)$/u

export function parseNameQuantityUnit(input: string): ParsedNameQuantityUnit | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  for (const re of [NAME_QTY_UNIT_RE, NAME_QTY_UNIT_TIGHT_RE]) {
    const match = trimmed.match(re)
    if (!match) continue
    const name = match[1]?.trim()
    const quantity = toFinitePositive(match[2])
    const unit = match[3]?.trim()
    if (!name || quantity == null || !unit) continue
    return { name, quantity, unit }
  }
  return null
}

export interface TemplateSeedCandidate {
  name: string
  unit: string
  defaultQuantity: number
  kcalPerUnit: number
}

export interface LogItemForTemplate {
  name: string
  quantity: number
  unit: string
  kcal: number
}

export function buildTemplateFromLogItem(
  item: LogItemForTemplate,
): TemplateSeedCandidate | null {
  const kcal = toFinitePositive(item.kcal)
  if (kcal == null) return null

  const parsed = parseNameQuantityUnit(item.name)
  const quantity = toFinitePositive(item.quantity) ?? parsed?.quantity
  const unit = item.unit.trim() || parsed?.unit
  const name = parsed?.name ?? item.name.trim()

  if (!name) return null

  if (quantity != null && unit) {
    const kcalPerUnit = kcal / quantity
    if (!Number.isFinite(kcalPerUnit) || kcalPerUnit <= 0) return null
    return {
      name,
      unit,
      defaultQuantity: quantity,
      kcalPerUnit: Math.round(kcalPerUnit * 10000) / 10000,
    }
  }

  return {
    name,
    unit: '份',
    defaultQuantity: 1,
    kcalPerUnit: kcal,
  }
}

export function isDuplicateTemplate(
  existing: Pick<LogTemplate, 'name' | 'unit'>[],
  candidate: Pick<TemplateSeedCandidate, 'name' | 'unit'>,
): boolean {
  const name = candidate.name.trim()
  const unit = candidate.unit.trim()
  return existing.some(
    (t) => t.name.trim() === name && t.unit.trim() === unit,
  )
}

export interface SaveTemplatesResult {
  createdCount: number
  skippedDuplicateCount: number
  failedCount: number
}

export async function saveTemplatesFromItems(input: {
  existingTemplates: Pick<LogTemplate, 'name' | 'unit'>[]
  items: TemplateSeedCandidate[]
  addTemplate: (payload: TemplateSeedCandidate) => Promise<unknown>
}): Promise<SaveTemplatesResult> {
  const result: SaveTemplatesResult = {
    createdCount: 0,
    skippedDuplicateCount: 0,
    failedCount: 0,
  }

  for (const item of input.items) {
    const name = item.name.trim()
    const unit = item.unit.trim()
    const kcalPerUnit = toFinitePositive(item.kcalPerUnit)
    const defaultQuantity = toFinitePositive(item.defaultQuantity)
    if (!name || !unit || kcalPerUnit == null || defaultQuantity == null) {
      result.failedCount += 1
      continue
    }

    if (
      isDuplicateTemplate(input.existingTemplates, { name, unit })
    ) {
      result.skippedDuplicateCount += 1
      continue
    }

    try {
      await input.addTemplate({
        name,
        unit,
        kcalPerUnit,
        defaultQuantity,
      })
      input.existingTemplates.push({ name, unit })
      result.createdCount += 1
    } catch {
      result.failedCount += 1
    }
  }

  return result
}

export interface AiEstimateItemInput {
  name: string
  quantityInput: string
  unit: string
  kcalInput: string
}

export interface ValidatedAiItem {
  name: string
  quantity: number
  unit: string
  kcal: number
}

export function validateAiItems(
  items: AiEstimateItemInput[],
): { ok: true; items: ValidatedAiItem[] } | { ok: false; error: string } {
  if (items.length === 0) {
    return { ok: false, error: '请先完成 AI 估算' }
  }

  const validated: ValidatedAiItem[] = []
  for (const item of items) {
    const name = item.name.trim()
    const unit = item.unit.trim()
    const quantity = toFinitePositive(item.quantityInput)
    const kcal = toFinitePositive(item.kcalInput)
    if (!name || !unit || quantity == null || kcal == null) {
      return { ok: false, error: '请检查每条记录的名称、数量、单位与热量' }
    }
    validated.push({ name, quantity, unit, kcal })
  }
  return { ok: true, items: validated }
}

export function aiItemsToLogPayload(
  items: ValidatedAiItem[],
): { name: string; kcal: number }[] {
  return items.map((item) => ({
    name: buildDraftRecordName(item.name, item.quantity, item.unit),
    kcal: Math.round(item.kcal),
  }))
}

export function formatTemplateSaveNotice(result: SaveTemplatesResult): string | null {
  const parts: string[] = []
  if (result.skippedDuplicateCount > 0) {
    parts.push('已存在同名同单位模板，已跳过')
  }
  if (result.failedCount > 0) {
    parts.push('部分模板保存失败')
  }
  if (parts.length === 0) return null
  return `记录已保存；${parts.join('；')}`
}

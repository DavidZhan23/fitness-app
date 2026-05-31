import { describe, expect, it, vi } from 'vitest'
import {
  aiItemsToLogPayload,
  buildDraftRecordName,
  buildTemplateFromLogItem,
  computeDraftKcal,
  formatApproxKcal,
  formatTemplateChipHint,
  isDuplicateTemplate,
  measureTemplateChipColumns,
  normalizeLogTemplate,
  parseNameQuantityUnit,
  saveTemplatesFromItems,
  sortTemplatesForPicker,
  toFinitePositive,
  validateAiItems,
} from '../logTemplate'

describe('toFinitePositive', () => {
  it('accepts positive numbers and numeric strings', () => {
    expect(toFinitePositive(1.65)).toBe(1.65)
    expect(toFinitePositive('100')).toBe(100)
  })

  it('rejects non-finite and non-positive values', () => {
    expect(toFinitePositive(0)).toBeNull()
    expect(toFinitePositive(-1)).toBeNull()
    expect(toFinitePositive('abc')).toBeNull()
    expect(toFinitePositive(NaN)).toBeNull()
  })
})

describe('normalizeLogTemplate', () => {
  it('uses new unit fields when present', () => {
    const t = normalizeLogTemplate(
      {
        id: '1',
        name: '鸡胸肉',
        unit: 'g',
        kcal_per_unit: '1.65',
        default_quantity: '100',
      },
      'meal',
    )
    expect(t).toEqual({
      id: '1',
      kind: 'meal',
      name: '鸡胸肉',
      unit: 'g',
      kcalPerUnit: 1.65,
      defaultQuantity: 100,
    })
  })

  it('falls back legacy kcal to 份/1/kcalPerUnit', () => {
    const t = normalizeLogTemplate(
      { id: '2', name: '米饭一碗', kcal: '230' },
      'meal',
    )
    expect(t).toMatchObject({
      unit: '份',
      kcalPerUnit: 230,
      defaultQuantity: 1,
      kcal: 230,
    })
  })

  it('returns null for invalid rows', () => {
    expect(normalizeLogTemplate({ name: 'x', kcal: 'bad' }, 'meal')).toBeNull()
  })
})

describe('computeDraftKcal', () => {
  it('computes rounded product', () => {
    expect(computeDraftKcal(150, 1.65)).toBe(248)
    expect(computeDraftKcal(1, 78)).toBe(78)
  })

  it('returns null for invalid inputs', () => {
    expect(computeDraftKcal(0, 1.65)).toBeNull()
    expect(computeDraftKcal(100, NaN)).toBeNull()
  })
})

describe('buildDraftRecordName', () => {
  it('formats quantity and unit', () => {
    expect(buildDraftRecordName('鸡胸肉', 150, 'g')).toBe('鸡胸肉 150g')
    expect(buildDraftRecordName('鸡蛋', 1, '个')).toBe('鸡蛋 1个')
  })
})

describe('formatApproxKcal', () => {
  it('never shows NaN', () => {
    expect(formatApproxKcal(165)).toBe('约 165 kcal')
    expect(formatApproxKcal(null)).toBe('—')
  })
})

describe('formatTemplateChipHint', () => {
  it('formats default serving with rounded kcal', () => {
    expect(
      formatTemplateChipHint({
        id: '1',
        kind: 'meal',
        name: '鸡胸肉',
        unit: 'g',
        kcalPerUnit: 1.65,
        defaultQuantity: 100,
      }),
    ).toBe('100g ≈ 165 kcal')
  })

  it('formats ml and 份 templates', () => {
    expect(
      formatTemplateChipHint({
        id: '2',
        kind: 'meal',
        name: '牛奶',
        unit: 'ml',
        kcalPerUnit: 0.6,
        defaultQuantity: 250,
      }),
    ).toBe('250ml ≈ 150 kcal')

    expect(
      formatTemplateChipHint({
        id: '3',
        kind: 'meal',
        name: '鸡蛋',
        unit: '个',
        kcalPerUnit: 78,
        defaultQuantity: 1,
      }),
    ).toBe('1个 ≈ 78 kcal')
  })

  it('formats exercise minute templates', () => {
    expect(
      formatTemplateChipHint({
        id: '4',
        kind: 'exercise',
        name: '跑步',
        unit: '分钟',
        kcalPerUnit: 10,
        defaultQuantity: 30,
      }),
    ).toBe('30分钟 ≈ 300 kcal')
  })

  it('returns empty string for invalid numeric data', () => {
    expect(
      formatTemplateChipHint({
        id: '5',
        kind: 'meal',
        name: 'Bad',
        unit: 'g',
        kcalPerUnit: 0,
        defaultQuantity: 100,
      }),
    ).toBe('')
  })
})

describe('sortTemplatesForPicker', () => {
  it('orders templates by created_at descending', () => {
    const sorted = sortTemplatesForPicker(
      [
        {
          id: 'old',
          name: '米饭',
          unit: 'g',
          kcal_per_unit: 1.15,
          default_quantity: 200,
          created_at: '2025-01-01T00:00:00Z',
        },
        {
          id: 'new',
          name: 'qwq',
          unit: 'g',
          kcal_per_unit: 2,
          default_quantity: 100,
          created_at: '2025-05-31T12:00:00Z',
        },
        {
          id: 'mid',
          name: '鸡蛋',
          unit: '个',
          kcal_per_unit: 78,
          default_quantity: 1,
          created_at: '2025-03-01T00:00:00Z',
        },
      ],
      'meal',
    )

    expect(sorted.map((t) => t.id)).toEqual(['new', 'mid', 'old'])
  })

  it('puts rows without created_at last', () => {
    const sorted = sortTemplatesForPicker(
      [
        {
          id: 'no-date',
          name: 'A',
          unit: '份',
          kcal_per_unit: 10,
          default_quantity: 1,
        },
        {
          id: 'dated',
          name: 'B',
          unit: '份',
          kcal_per_unit: 10,
          default_quantity: 1,
          created_at: '2025-05-01T00:00:00Z',
        },
      ],
      'meal',
    )

    expect(sorted.map((t) => t.id)).toEqual(['dated', 'no-date'])
  })
})

describe('measureTemplateChipColumns', () => {
  it('returns at least 2 columns and grows with width', () => {
    expect(measureTemplateChipColumns(320, 8)).toBe(2)
    expect(measureTemplateChipColumns(500, 8)).toBeGreaterThanOrEqual(3)
  })
})

describe('parseNameQuantityUnit', () => {
  it('parses spaced and tight patterns', () => {
    expect(parseNameQuantityUnit('鸡胸肉 150g')).toEqual({
      name: '鸡胸肉',
      quantity: 150,
      unit: 'g',
    })
    expect(parseNameQuantityUnit('牛奶250ml')).toEqual({
      name: '牛奶',
      quantity: 250,
      unit: 'ml',
    })
    expect(parseNameQuantityUnit('鸡蛋 1个')).toEqual({
      name: '鸡蛋',
      quantity: 1,
      unit: '个',
    })
    expect(parseNameQuantityUnit('慢跑 40 分钟')).toEqual({
      name: '慢跑',
      quantity: 40,
      unit: '分钟',
    })
  })

  it('returns null when pattern missing', () => {
    expect(parseNameQuantityUnit('公司食堂午饭')).toBeNull()
  })
})

describe('buildTemplateFromLogItem', () => {
  it('derives kcalPerUnit from quantity', () => {
    expect(
      buildTemplateFromLogItem({
        name: '鸡胸肉',
        quantity: 150,
        unit: 'g',
        kcal: 248,
      }),
    ).toMatchObject({
      name: '鸡胸肉',
      unit: 'g',
      defaultQuantity: 150,
      kcalPerUnit: 1.6533,
    })
  })

  it('falls back to 份 when quantity unknown', () => {
    expect(
      buildTemplateFromLogItem({
        name: '公司食堂午饭',
        quantity: 1,
        unit: '份',
        kcal: 700,
      }),
    ).toEqual({
      name: '公司食堂午饭',
      unit: '份',
      defaultQuantity: 1,
      kcalPerUnit: 700,
    })
  })
})

describe('isDuplicateTemplate', () => {
  it('matches name and unit', () => {
    expect(
      isDuplicateTemplate(
        [{ name: '鸡蛋', unit: '个' }],
        { name: '鸡蛋', unit: '个' },
      ),
    ).toBe(true)
  })
})

describe('saveTemplatesFromItems', () => {
  it('skips duplicates and creates new templates', async () => {
    const addTemplate = vi.fn().mockResolvedValue({})
    const result = await saveTemplatesFromItems({
      existingTemplates: [{ name: '鸡蛋', unit: '个' }],
      items: [
        { name: '鸡蛋', unit: '个', defaultQuantity: 1, kcalPerUnit: 78 },
        { name: '牛奶', unit: 'ml', defaultQuantity: 250, kcalPerUnit: 0.6 },
      ],
      addTemplate,
    })
    expect(result).toEqual({
      createdCount: 1,
      skippedDuplicateCount: 1,
      failedCount: 0,
    })
    expect(addTemplate).toHaveBeenCalledTimes(1)
  })
})

describe('validateAiItems', () => {
  it('validates all fields', () => {
    const result = validateAiItems([
      {
        name: '牛肉面',
        quantityInput: '1',
        unit: '碗',
        kcalInput: '650',
      },
    ])
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(aiItemsToLogPayload(result.items)).toEqual([
        { name: '牛肉面 1碗', kcal: 650 },
      ])
    }
  })

  it('rejects invalid item', () => {
    expect(
      validateAiItems([
        { name: '', quantityInput: '1', unit: '碗', kcalInput: '650' },
      ]).ok,
    ).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'
import {
  buildEstimateResult,
  defaultReason,
  FALLBACK_REASON,
  normalizeConfidence,
  normalizeEstimateItems,
  normalizeReason,
  parseEstimatePayload,
} from '../src/ai/providers/deepseekText.js'

describe('parseEstimatePayload', () => {
  it('parses pure JSON with items', () => {
    const parsed = parseEstimatePayload(
      JSON.stringify({
        kcal: 999,
        items: [
          { name: '牛肉面', quantity: 1, unit: '碗', kcal: 650 },
          { name: '鸡蛋', quantity: 1, unit: '个', kcal: 78 },
        ],
      }),
    )
    expect(parsed.items).toHaveLength(2)
  })

  it('parses fenced json code block', () => {
    const parsed = parseEstimatePayload(
      '```json\n{"items":[{"name":"牛肉面","quantity":1,"unit":"碗","kcal":650}]}\n```',
    )
    expect(parsed.items).toHaveLength(1)
  })

  it('extracts JSON object from surrounding text', () => {
    const parsed = parseEstimatePayload(
      '估算如下：{"items":[{"name":"鸡蛋","quantity":1,"unit":"个","kcal":78}]} 完毕',
    )
    expect(parsed.items).toHaveLength(1)
  })

  it('falls back to kcal-only object', () => {
    expect(parseEstimatePayload('{"kcal":550}')).toEqual({ kcal: 550 })
  })

  it('falls back to single number in text', () => {
    expect(parseEstimatePayload('550')).toEqual({ kcal: 550 })
  })
})

describe('normalizeConfidence', () => {
  it('accepts high, medium, low', () => {
    expect(normalizeConfidence('high')).toBe('high')
    expect(normalizeConfidence('medium')).toBe('medium')
    expect(normalizeConfidence('low')).toBe('low')
  })

  it('defaults invalid values to medium', () => {
    expect(normalizeConfidence('unknown')).toBe('medium')
    expect(normalizeConfidence(null)).toBe('medium')
  })
})

describe('normalizeReason', () => {
  it('uses default reason when empty', () => {
    expect(normalizeReason('', 'high')).toBe(defaultReason('high'))
    expect(normalizeReason('  ', 'low')).toBe(defaultReason('low'))
  })

  it('truncates to 60 Unicode characters without throwing', () => {
    const long = '份'.repeat(80)
    const result = normalizeReason(long, 'medium')
    expect(Array.from(result)).toHaveLength(60)
    expect(result).toBe('份'.repeat(60))
  })

  it('passes through short custom reason', () => {
    expect(normalizeReason('按一碗牛肉面估算', 'medium')).toBe('按一碗牛肉面估算')
  })
})

describe('normalizeEstimateItems', () => {
  it('filters invalid items and applies defaults for meal', () => {
    const items = normalizeEstimateItems(
      [
        { name: ' 米饭 ', quantity: 200, unit: 'g', kcal: 230 },
        { name: '', quantity: 1, unit: '份', kcal: 100 },
        { name: '无效', quantity: 0, unit: '份', kcal: 100 },
        { name: '牛奶', kcal: 120 },
      ],
      'meal',
    )
    expect(items).toEqual([
      {
        name: '米饭',
        quantity: 200,
        unit: 'g',
        kcal: 230,
        confidence: 'medium',
        reason: defaultReason('medium'),
      },
      {
        name: '牛奶',
        quantity: 1,
        unit: '份',
        kcal: 120,
        confidence: 'medium',
        reason: defaultReason('medium'),
      },
    ])
  })

  it('passes through confidence and reason', () => {
    const items = normalizeEstimateItems(
      [
        {
          name: '牛肉',
          quantity: 1,
          unit: '碗',
          kcal: 350,
          confidence: 'medium',
          reason: '按一碗牛肉面估算',
        },
      ],
      'meal',
    )
    expect(items[0]).toMatchObject({
      confidence: 'medium',
      reason: '按一碗牛肉面估算',
    })
  })

  it('defaults exercise unit to 分钟', () => {
    const items = normalizeEstimateItems(
      [{ name: '慢跑', quantity: 40, kcal: 300 }],
      'exercise',
    )
    expect(items[0]?.unit).toBe('分钟')
  })

  it('clamps item kcal to 1-5000', () => {
    const items = normalizeEstimateItems(
      [{ name: '超大餐', quantity: 1, unit: '份', kcal: 9000 }],
      'meal',
    )
    expect(items[0]?.kcal).toBe(5000)
  })
})

describe('buildEstimateResult', () => {
  it('sums item kcal and ignores top-level kcal', () => {
    const result = buildEstimateResult(
      {
        kcal: 999,
        items: [
          {
            name: '牛肉面',
            quantity: 1,
            unit: '碗',
            kcal: 650,
            confidence: 'medium',
            reason: '按一碗估算',
          },
          {
            name: '鸡蛋',
            quantity: 1,
            unit: '个',
            kcal: 78,
            confidence: 'high',
            reason: '按一个估算',
          },
        ],
      },
      'meal',
    )
    expect(result.kcal).toBe(728)
    expect(result.items).toHaveLength(2)
    expect(result.items?.[0]).toMatchObject({
      name: '牛肉面',
      confidence: 'medium',
      reason: '按一碗估算',
    })
  })

  it('returns fallback item when no valid items but top-level kcal', () => {
    const result = buildEstimateResult(
      { kcal: 550 },
      'meal',
      { description: '一顿简餐' },
    )
    expect(result).toEqual({
      kcal: 550,
      items: [
        {
          name: '一顿简餐',
          quantity: 1,
          unit: '份',
          kcal: 550,
          confidence: 'medium',
          reason: FALLBACK_REASON,
        },
      ],
    })
  })

  it('falls back when all items invalid', () => {
    expect(
      buildEstimateResult(
        {
          kcal: 480,
          items: [{ name: '', quantity: 1, unit: '份', kcal: 100 }],
        },
        'meal',
        { description: '简餐' },
      ),
    ).toEqual({
      kcal: 480,
      items: [
        {
          name: '简餐',
          quantity: 1,
          unit: '份',
          kcal: 480,
          confidence: 'medium',
          reason: FALLBACK_REASON,
        },
      ],
    })
  })

  it('handles exercise multi-item sample', () => {
    const result = buildEstimateResult(
      {
        items: [
          { name: '慢跑', quantity: 40, unit: '分钟', kcal: 320 },
          { name: '跳绳', quantity: 10, unit: '分钟', kcal: 90 },
        ],
      },
      'exercise',
    )
    expect(result.kcal).toBe(410)
    expect(result.items).toHaveLength(2)
    expect(result.items?.[0]).toMatchObject({
      confidence: 'medium',
      reason: defaultReason('medium'),
    })
  })
})

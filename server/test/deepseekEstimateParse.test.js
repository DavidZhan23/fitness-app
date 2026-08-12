import { describe, expect, it } from 'vitest'
import {
  buildEstimateResult,
  DEFAULT_DEEPSEEK_MODEL,
  deepSeekNonThinkingExtras,
  defaultReason,
  EXERCISE_NET_ACTIVITY_RULES,
  FALLBACK_REASON,
  normalizeConfidence,
  normalizeEstimateItems,
  normalizeReason,
  parseEstimatePayload,
  resolveDeepSeekModel,
} from '../src/ai/providers/deepseekText.js'

describe('resolveDeepSeekModel', () => {
  it('defaults to v4-flash and remaps retired aliases', () => {
    expect(resolveDeepSeekModel('')).toBe(DEFAULT_DEEPSEEK_MODEL)
    expect(resolveDeepSeekModel('deepseek-chat')).toBe('deepseek-v4-flash')
    expect(resolveDeepSeekModel('deepseek-reasoner')).toBe('deepseek-v4-flash')
    expect(resolveDeepSeekModel('deepseek-v4-pro')).toBe('deepseek-v4-pro')
  })

  it('disables thinking for chat-style requests', () => {
    expect(deepSeekNonThinkingExtras()).toEqual({ thinking: { type: 'disabled' } })
  })
})

describe('EXERCISE_NET_ACTIVITY_RULES', () => {
  it('requires net activity kcal excluding basal metabolism', () => {
    expect(EXERCISE_NET_ACTIVITY_RULES).toMatch(/基础代谢/)
    expect(EXERCISE_NET_ACTIVITY_RULES).toMatch(/增量消耗|额外耗能/)
    expect(EXERCISE_NET_ACTIVITY_RULES).toMatch(/步行/)
  })
})

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
  it('filters invalid items and applies defaults for meal (kcal = per unit)', () => {
    const items = normalizeEstimateItems(
      [
        { name: ' 米饭 ', quantity: 200, unit: 'g', kcal: 1.15 },
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
        kcal: 1.15,
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

  it('keeps valid per-unit meal macros and drops them for exercise', () => {
    const raw = {
      name: '牛奶',
      quantity: 250,
      unit: 'ml',
      kcal: 0.6,
      protein_g: 0.032,
      fat_g: 0.036,
      carbs_g: 0.048,
      sugar_g: 0.06,
    }
    expect(normalizeEstimateItems([raw], 'meal')[0]).toMatchObject({
      protein_g: 0.032,
      fat_g: 0.036,
      carbs_g: 0.048,
      sugar_g: 0.06,
    })
    expect(normalizeEstimateItems([raw], 'exercise')[0]).not.toHaveProperty(
      'protein_g',
    )
  })

  it('defaults exercise unit to 分钟', () => {
    const items = normalizeEstimateItems(
      [{ name: '慢跑', quantity: 40, kcal: 8 }],
      'exercise',
    )
    expect(items[0]?.unit).toBe('分钟')
    expect(items[0]?.kcal).toBe(8)
  })

  it('clamps item kcal (per unit) to max 5000 and allows fractional < 1', () => {
    const high = normalizeEstimateItems(
      [{ name: '超大餐', quantity: 1, unit: '份', kcal: 9000 }],
      'meal',
    )
    expect(high[0]?.kcal).toBe(5000)

    const fractional = normalizeEstimateItems(
      [{ name: '牛奶', quantity: 250, unit: 'ml', kcal: 0.6 }],
      'meal',
    )
    expect(fractional[0]?.kcal).toBe(0.6)
  })
})

describe('buildEstimateResult', () => {
  it('sums quantity × per-unit kcal and ignores top-level kcal', () => {
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
            quantity: 2,
            unit: '个',
            kcal: 78,
            confidence: 'high',
            reason: '按一个估算',
          },
        ],
      },
      'meal',
    )
    expect(result.kcal).toBe(650 + 156)
    expect(result.items).toHaveLength(2)
    expect(result.items?.[0]).toMatchObject({
      name: '牛肉面',
      kcal: 650,
      confidence: 'medium',
      reason: '按一碗估算',
    })
    expect(result.items?.[1]).toMatchObject({
      quantity: 2,
      kcal: 78,
    })
  })

  it('rounds each line quantity × per-unit before summing', () => {
    const result = buildEstimateResult(
      {
        items: [{ name: '鸡胸肉', quantity: 150, unit: 'g', kcal: 1.65 }],
      },
      'meal',
    )
    expect(result.kcal).toBe(248)
    expect(result.items?.[0]?.kcal).toBe(1.65)
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

  it('handles exercise multi-item sample (kcal = per minute)', () => {
    const result = buildEstimateResult(
      {
        items: [
          { name: '慢跑', quantity: 40, unit: '分钟', kcal: 8 },
          { name: '跳绳', quantity: 10, unit: '分钟', kcal: 9 },
        ],
      },
      'exercise',
    )
    expect(result.kcal).toBe(320 + 90)
    expect(result.items).toHaveLength(2)
    expect(result.items?.[0]).toMatchObject({
      kcal: 8,
      confidence: 'medium',
      reason: defaultReason('medium'),
    })
  })
})

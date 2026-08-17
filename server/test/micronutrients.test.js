import { describe, expect, it } from 'vitest'
import { buildMealMicronutrientSystemPrompt } from '../src/ai/providers/deepseekText.js'
import { resolveMicronutrientTargets } from '../src/micronutrientTargets.js'
import {
  MICRONUTRIENT_IDS,
  PENDING_STALE_MS,
  createMealMicronutrientFingerprint,
  createMicronutrientFingerprint,
  isMicronutrientResultCurrent,
  mealNeedsMicronutrientEstimate,
  normalizeMealMicronutrients,
  normalizeMicronutrientSummary,
  rollupMicronutrientSummary,
  shouldAutoScheduleMicronutrientRefresh,
} from '../src/micronutrients.js'

const meals = [
  { id: 'b', name: '菠菜鸡蛋', kcal: '220.00' },
  { id: 'a', name: '牛肉饭', kcal: '500.00' },
]

function mealEstimate(overrides = {}) {
  return {
    components: [{ name: '牛肉', grams: 80 }, { name: '米饭', grams: 150 }],
    items: MICRONUTRIENT_IDS.map((id) => ({
      id,
      amount: id === 'iron' ? 2.4 : 0,
      unit: id === 'iron' ? 'mg' : undefined,
      confidence: id === 'iron' ? 'high' : 'unknown',
    })),
    ...overrides,
  }
}

describe('daily micronutrients', () => {
  it('creates an order-independent meal fingerprint from id/name/kcal', () => {
    const fingerprint = createMicronutrientFingerprint(meals)
    expect(createMicronutrientFingerprint([...meals].reverse())).toBe(fingerprint)
    expect(
      createMicronutrientFingerprint([
        meals[0],
        { ...meals[1], kcal: '501.00' },
      ]),
    ).not.toBe(fingerprint)
  })

  it('re-estimates a meal only when name or kcal changes', () => {
    const fingerprint = createMealMicronutrientFingerprint('牛肉饭', '500.00')
    const stored = {
      name: '牛肉饭',
      kcal: '500.00',
      micronutrients_fingerprint: fingerprint,
      micronutrients: mealEstimate(),
    }
    expect(mealNeedsMicronutrientEstimate(stored)).toBe(false)
    expect(
      mealNeedsMicronutrientEstimate({
        ...stored,
        protein_g: 40,
      }),
    ).toBe(false)
    expect(
      mealNeedsMicronutrientEstimate({
        ...stored,
        name: '牛肉面',
      }),
    ).toBe(true)
  })

  it('normalizes meal estimates, fills 16 ids and clamps absurd amounts', () => {
    const payload = normalizeMealMicronutrients({
      components: [
        { name: '菠菜', grams: 80 },
        { name: '菠菜', grams: 10 },
        { name: '', grams: 20 },
      ],
      items: [
        { id: 'iron', amount: 2.4, unit: 'mg', confidence: 'high' },
        { id: 'calcium', amount: 9000, unit: 'mg', confidence: 'high' },
        { id: 'vit_a', amount: 0.3, unit: 'mg', confidence: 'medium' },
        { id: 'made_up', amount: 1, unit: 'mg' },
      ],
    })
    expect(payload.items).toHaveLength(16)
    expect(payload.components).toEqual([{ name: '菠菜', grams: 80 }])
    expect(payload.items.find((item) => item.id === 'iron')).toMatchObject({
      amount: 2.4,
      unit: 'mg',
      confidence: 'high',
    })
    expect(payload.items.find((item) => item.id === 'calcium')).toMatchObject({
      amount: 3000,
      confidence: 'low',
    })
    expect(payload.items.find((item) => item.id === 'vit_a')).toMatchObject({
      amount: 300,
      unit: 'µg',
    })
    expect(payload.items.find((item) => item.id === 'iodine')).toMatchObject({
      amount: 0,
      confidence: 'unknown',
    })
  })

  it('keeps day totals monotonic when a non-negative meal is added', () => {
    const first = {
      micronutrients: mealEstimate({
        items: MICRONUTRIENT_IDS.map((id) => ({
          id,
          amount: id === 'iron' ? 3 : id === 'vit_c' ? 40 : 0,
          unit: id === 'vit_c' || id === 'iron' ? 'mg' : undefined,
          confidence: 'high',
        })),
      }),
    }
    const apple = {
      micronutrients: mealEstimate({
        items: MICRONUTRIENT_IDS.map((id) => ({
          id,
          amount: id === 'vit_c' ? 8 : 0,
          unit: 'mg',
          confidence: id === 'vit_c' ? 'medium' : 'unknown',
        })),
      }),
    }
    const before = rollupMicronutrientSummary([first], {
      sex: 'female',
      age: 30,
    })
    const after = rollupMicronutrientSummary([first, apple], {
      sex: 'female',
      age: 30,
    })
    for (const id of MICRONUTRIENT_IDS) {
      const prev = before.items.find((item) => item.id === id)
      const next = after.items.find((item) => item.id === id)
      expect(next.estimated_amount).toBeGreaterThanOrEqual(prev.estimated_amount)
    }
    expect(before.items.find((item) => item.id === 'iron')?.status).toBe('low')
    expect(after.items.find((item) => item.id === 'iron')?.status).not.toBe(
      'adequate',
    )
    const adequateBefore = new Set(
      before.items.filter((item) => item.status === 'adequate').map((item) => item.id),
    )
    for (const id of adequateBefore) {
      expect(after.items.find((item) => item.id === id)?.status).not.toBe('low')
    }
  })

  it('does not turn adequate into low when adding a zero-amount meal', () => {
    const rich = {
      micronutrients: mealEstimate({
        items: MICRONUTRIENT_IDS.map((id) => ({
          id,
          amount: id === 'vit_c' ? 120 : 0,
          unit: 'mg',
          confidence: id === 'vit_c' ? 'high' : 'unknown',
        })),
      }),
    }
    const empty = {
      micronutrients: mealEstimate({
        items: MICRONUTRIENT_IDS.map((id) => ({
          id,
          amount: 0,
          confidence: 'unknown',
        })),
      }),
    }
    const before = rollupMicronutrientSummary([rich], { sex: 'female', age: 30 })
    const after = rollupMicronutrientSummary([rich, empty], {
      sex: 'female',
      age: 30,
    })
    expect(before.items.find((item) => item.id === 'vit_c')?.status).toBe(
      'adequate',
    )
    expect(after.items.find((item) => item.id === 'vit_c')?.status).toBe(
      'adequate',
    )
  })

  it('subtracts a deleted meal from the day total', () => {
    const steak = {
      micronutrients: mealEstimate({
        items: MICRONUTRIENT_IDS.map((id) => ({
          id,
          amount: id === 'iron' ? 3 : 0,
          unit: 'mg',
          confidence: 'high',
        })),
      }),
    }
    const rice = {
      micronutrients: mealEstimate({
        items: MICRONUTRIENT_IDS.map((id) => ({
          id,
          amount: id === 'iron' ? 1 : 0,
          unit: 'mg',
          confidence: 'medium',
        })),
      }),
    }
    const both = rollupMicronutrientSummary([steak, rice], {
      sex: 'male',
      age: 30,
    })
    const afterDelete = rollupMicronutrientSummary([steak], {
      sex: 'male',
      age: 30,
    })
    expect(both.items.find((item) => item.id === 'iron')?.estimated_amount).toBe(4)
    expect(
      afterDelete.items.find((item) => item.id === 'iron')?.estimated_amount,
    ).toBe(3)
  })

  it('uses a higher iron reference when sex is missing', () => {
    const unknown = resolveMicronutrientTargets({ age: 30 })
    const female = resolveMicronutrientTargets({ sex: 'female', age: 30 })
    expect(unknown.amounts.iron).toBe(female.amounts.iron)
    expect(unknown.label).toContain('性别未填')
  })

  it('keeps a v1 qualitative snapshot readable', () => {
    const summary = normalizeMicronutrientSummary({
      items: [
        {
          id: 'iron',
          status: 'low',
          note: '来源较少',
          food_suggestions: ['瘦肉', '菠菜'],
        },
      ],
      advice: '搭配更多样的天然食物。',
    })
    expect(summary.version).toBe(1)
    expect(summary.items).toHaveLength(16)
    expect(summary.items.find((item) => item.id === 'iron')?.status).toBe('low')
    expect(summary.items.find((item) => item.id === 'iodine')?.status).toBe(
      'unknown',
    )
  })

  it('rejects a response without an items array', () => {
    expect(() => normalizeMicronutrientSummary({ advice: '没有清单' })).toThrow(
      /格式无效/,
    )
  })

  it('rejects stale task fingerprints before a result can be written', () => {
    const taskFingerprint = createMicronutrientFingerprint(meals)
    expect(isMicronutrientResultCurrent(taskFingerprint, meals)).toBe(true)
    expect(
      isMicronutrientResultCurrent(taskFingerprint, [
        ...meals,
        { id: 'c', name: '苹果', kcal: '95.00' },
      ]),
    ).toBe(false)
  })

  it('asks the meal prompt to decompose ingredients and return amounts', () => {
    const prompt = buildMealMicronutrientSystemPrompt()
    expect(prompt).toContain('vit_b12')
    expect(prompt).toContain('拆成配料')
    expect(prompt).toContain('mg')
    expect(prompt).toContain('µg')
    expect(prompt).toContain('禁止保健品、补充剂、品牌和服用剂量')
    expect(prompt).not.toContain('严禁输出毫克')
  })

  it('only auto-hits Pro for today and never repeats finished or historical days', () => {
    const now = Date.parse('2026-08-17T06:00:00.000Z')
    const today = '2026-08-17'
    expect(
      shouldAutoScheduleMicronutrientRefresh({
        needsAi: true,
        status: 'idle',
        updatedAt: null,
        logDate: today,
        today,
        now,
      }),
    ).toBe(true)
    expect(
      shouldAutoScheduleMicronutrientRefresh({
        needsAi: true,
        status: 'idle',
        updatedAt: null,
        logDate: '2026-08-16',
        today,
        now,
      }),
    ).toBe(false)
    expect(
      shouldAutoScheduleMicronutrientRefresh({
        needsAi: true,
        status: 'pending',
        updatedAt: new Date(now - 30_000).toISOString(),
        logDate: today,
        today,
        now,
      }),
    ).toBe(false)
    expect(
      shouldAutoScheduleMicronutrientRefresh({
        needsAi: true,
        status: 'pending',
        updatedAt: new Date(now - PENDING_STALE_MS - 1).toISOString(),
        logDate: today,
        today,
        now,
      }),
    ).toBe(true)
    expect(
      shouldAutoScheduleMicronutrientRefresh({
        needsAi: true,
        status: 'error',
        updatedAt: new Date(now - 5_000).toISOString(),
        logDate: today,
        today,
        now,
      }),
    ).toBe(false)
    expect(
      shouldAutoScheduleMicronutrientRefresh({
        needsAi: true,
        status: 'ready',
        updatedAt: new Date(now - 7 * 60 * 60 * 1000).toISOString(),
        logDate: today,
        today,
        now,
      }),
    ).toBe(false)
    expect(
      shouldAutoScheduleMicronutrientRefresh({
        needsAi: false,
        status: 'idle',
        logDate: today,
        today,
        now,
      }),
    ).toBe(false)
  })
})

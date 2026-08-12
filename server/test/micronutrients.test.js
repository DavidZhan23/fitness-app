import { describe, expect, it } from 'vitest'
import { buildMicronutrientSystemPrompt } from '../src/ai/providers/deepseekText.js'
import {
  MICRONUTRIENT_IDS,
  createMicronutrientFingerprint,
  isMicronutrientResultCurrent,
  normalizeMicronutrientSummary,
} from '../src/micronutrients.js'

const meals = [
  { id: 'b', name: '菠菜鸡蛋', kcal: '220.00' },
  { id: 'a', name: '牛肉饭', kcal: '500.00' },
]

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

  it('drops unknown ids, fills missing ids and normalizes low suggestions', () => {
    const summary = normalizeMicronutrientSummary({
      items: [
        {
          id: 'iron',
          status: 'low',
          note: '估计只有 3mg，红肉和豆类来源较少',
          food_suggestions: ['瘦肉', '菠菜', '某品牌铁剂 20mg', '豆类'],
        },
        { id: 'vit_c', status: 'adequate', food_suggestions: ['橙子'] },
        { id: 'made_up', status: 'low', food_suggestions: ['保健品'] },
      ],
      advice: '搭配更多样的天然食物。'.repeat(20),
    })

    expect(summary.items).toHaveLength(16)
    expect(summary.items.map((item) => item.id)).toEqual(MICRONUTRIENT_IDS)
    expect(summary.items.find((item) => item.id === 'iron')).toMatchObject({
      status: 'low',
      note: '根据当天餐食名称推断，相关食物来源可能较少。',
      food_suggestions: ['瘦肉', '菠菜', '豆类'],
    })
    expect(summary.items.find((item) => item.id === 'vit_c')).toMatchObject({
      status: 'adequate',
      food_suggestions: [],
    })
    expect(summary.items.find((item) => item.id === 'iodine')?.status).toBe(
      'unknown',
    )
    expect(Array.from(summary.advice)).toHaveLength(80)

    expect(
      normalizeMicronutrientSummary({
        items: [],
        advice: '维生素摄入约达到 80%，继续保持。',
      }).advice,
    ).toBe('')
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

  it('keeps the micronutrient prompt separate and non-quantitative', () => {
    const prompt = buildMicronutrientSystemPrompt()
    expect(prompt).toContain('vit_b12')
    expect(prompt).toContain('adequate、low、unknown')
    expect(prompt).toContain('严禁输出毫克、微克、达标率')
    expect(prompt).toContain('禁止保健品、补充剂、品牌和服用剂量')
  })
})

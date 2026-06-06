import { describe, expect, it } from 'vitest'
import {
  buildMealVisionSystemPrompt,
  buildMealVisionUserPrompt,
  MEAL_PHOTO_SHOOTING_GUIDE,
  parseMealImageDataUrl,
} from '../src/ai/providers/qwenVision.js'

describe('qwenVision meal photo prompts', () => {
  it('includes shooting distance guidance in system prompt', () => {
    const prompt = buildMealVisionSystemPrompt()
    expect(prompt).toContain('30–40 cm')
    expect(prompt).toContain('40–60 cm')
    expect(prompt).toContain('60%–80%')
    expect(MEAL_PHOTO_SHOOTING_GUIDE).toMatch(/30–40 cm/)
  })

  it('asks model to assess photo quality in user prompt', () => {
    const prompt = buildMealVisionUserPrompt('小份')
    expect(prompt).toContain('用户补充说明：小份')
    expect(prompt).toContain('30–40 cm')
    expect(prompt).toContain('confidence')
  })

  it('handles missing supplement', () => {
    expect(buildMealVisionUserPrompt('')).toContain('用户未补充文字说明')
  })
})

describe('parseMealImageDataUrl', () => {
  it('accepts jpeg data url', () => {
    const parsed = parseMealImageDataUrl(
      'data:image/jpeg;base64,' + 'abcd'.repeat(12),
    )
    expect(parsed.mime).toBe('image/jpeg')
  })

  it('rejects invalid format', () => {
    expect(() => parseMealImageDataUrl('not-an-image')).toThrow(/格式无效/)
  })

  it('rejects empty input', () => {
    expect(() => parseMealImageDataUrl('')).toThrow(/请上传/)
  })
})

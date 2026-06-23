import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { getProgressLineCategory } from '../../components/fox/foxLines'
import { validateFoxChatResponse } from '../../components/fox/foxTypes'

describe('validateFoxChatResponse', () => {
  it('accepts a valid object and clamps duration', () => {
    expect(validateFoxChatResponse({
      text: '这股自律劲儿，真漂亮。',
      mood: 'proud',
      motion: 'praise',
      expression: 'proud',
      bubbleStyle: 'gold',
      duration: 12,
    })).toMatchObject({ duration: 10, mood: 'proud' })
  })

  it('rejects invalid JSON, enums, and overly long text', () => {
    expect(validateFoxChatResponse('{bad')).toBeNull()
    expect(validateFoxChatResponse({
      text: '测试', mood: 'unknown', motion: 'idle', expression: 'neutral',
      bubbleStyle: 'warm', duration: 6,
    })).toBeNull()
    expect(validateFoxChatResponse({
      text: '小'.repeat(81), mood: 'idle', motion: 'idle', expression: 'neutral',
      bubbleStyle: 'warm', duration: 6,
    })).toBeNull()
  })
})

describe('getProgressLineCategory', () => {
  it('maps progress to the intended local line category', () => {
    expect(getProgressLineCategory(0)).toBe('lazy')
    expect(getProgressLineCategory(0.2)).toBe('encourage')
    expect(getProgressLineCategory(0.5)).toBe('teasing')
    expect(getProgressLineCategory(0.9)).toBe('praise')
    expect(getProgressLineCategory(1)).toBe('completed')
  })
})

describe('Huawei WebView sprite compatibility', () => {
  it('never horizontally scales the fox artwork', () => {
    const css = readFileSync(new URL('../../index.css', import.meta.url), 'utf8')
    const foxStart = css.indexOf('/* 今日页：本周运动大王狐狸陪伴 */')
    const foxEnd = css.indexOf('/* 今日记录：', foxStart)
    const foxCss = css.slice(foxStart, foxEnd)

    expect(foxStart).toBeGreaterThanOrEqual(0)
    expect(foxEnd).toBeGreaterThan(foxStart)
    expect(foxCss).not.toContain('scaleX(')
    expect(foxCss).not.toContain('calc(-1 *')
    expect(foxCss).not.toContain('--fox-translate')
    expect(foxCss).toContain('left: var(--fox-edge)')
    expect(foxCss).toContain('left: var(--fox-right-position)')
    expect(foxCss).toContain('fox-facing-left')
    expect(foxCss).toContain('fox-facing-right')
    expect(foxCss).toContain('opacity: 0')
  })
})

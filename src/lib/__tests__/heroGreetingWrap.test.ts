import { describe, expect, it } from 'vitest'
import { shouldAllowHeroGreetingWrap } from '../heroGreetingWrap'

describe('shouldAllowHeroGreetingWrap', () => {
  it('allows wrap for custom title', () => {
    expect(
      shouldAllowHeroGreetingWrap({
        customTitle: '短',
        title: '短',
      }),
    ).toBe(true)
  })

  it('allows wrap when title length >= 10', () => {
    expect(
      shouldAllowHeroGreetingWrap({
        customTitle: '',
        title: '一二三四五六七八九十',
      }),
    ).toBe(true)
  })

  it('allows wrap at punctuation boundaries', () => {
    expect(
      shouldAllowHeroGreetingWrap({
        customTitle: '',
        title: '同步率上升，可不敢再胖',
      }),
    ).toBe(true)
  })

  it('allows wrap when title contains comma before name placeholder', () => {
    expect(
      shouldAllowHeroGreetingWrap({
        customTitle: '',
        title: '深海已点亮，{name}。',
      }),
    ).toBe(true)
  })

  it('disallows wrap for very short titles without punctuation', () => {
    expect(
      shouldAllowHeroGreetingWrap({
        customTitle: '',
        title: '早安',
      }),
    ).toBe(false)
  })
})

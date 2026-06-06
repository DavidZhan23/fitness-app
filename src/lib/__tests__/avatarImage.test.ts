import { describe, expect, it, vi } from 'vitest'
import {
  assertAvatarFile,
  calculateAvatarSourceSize,
  canvasToAvatarDataUrl,
} from '../avatarImage'

describe('assertAvatarFile', () => {
  it('accepts image files regardless of source file size', () => {
    const file = { type: 'image/jpeg', size: 100 * 1024 * 1024 } as File
    expect(() => assertAvatarFile(file)).not.toThrow()
  })

  it('rejects non-image files', () => {
    const file = { type: 'application/pdf', size: 1024 } as File
    expect(() => assertAvatarFile(file)).toThrow('请选择图片文件')
  })
})

describe('calculateAvatarSourceSize', () => {
  it('reduces files over 20MB to a 2048px longest edge', () => {
    expect(calculateAvatarSourceSize(6000, 4000, 20 * 1024 * 1024 + 1)).toEqual({
      width: 2048,
      height: 1365,
      shouldResize: true,
    })
  })

  it('reduces high-resolution files to a 4096px longest edge', () => {
    expect(calculateAvatarSourceSize(8000, 6000, 10 * 1024 * 1024)).toEqual({
      width: 4096,
      height: 3072,
      shouldResize: true,
    })
  })

  it('keeps ordinary images unchanged', () => {
    expect(calculateAvatarSourceSize(1600, 1200, 5 * 1024 * 1024)).toEqual({
      width: 1600,
      height: 1200,
      shouldResize: false,
    })
  })
})

describe('canvasToAvatarDataUrl', () => {
  it('lowers JPEG quality until the avatar fits', () => {
    const oversized = `data:image/jpeg;base64,${'a'.repeat(110_000)}`
    const fitting = 'data:image/jpeg;base64,fits'
    const toDataURL = vi
      .fn()
      .mockReturnValueOnce(oversized)
      .mockReturnValueOnce(fitting)

    expect(canvasToAvatarDataUrl({ toDataURL })).toBe(fitting)
    expect(toDataURL).toHaveBeenNthCalledWith(1, 'image/jpeg', 0.85)
    expect(toDataURL).toHaveBeenNthCalledWith(2, 'image/jpeg', 0.75)
  })

  it('reports an error when every quality remains oversized', () => {
    const oversized = `data:image/jpeg;base64,${'a'.repeat(110_000)}`
    const toDataURL = vi.fn().mockReturnValue(oversized)

    expect(() => canvasToAvatarDataUrl({ toDataURL })).toThrow(
      '图片压缩后仍过大',
    )
    expect(toDataURL).toHaveBeenCalledTimes(5)
  })
})

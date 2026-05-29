import { describe, expect, it } from 'vitest'
import {
  computeDayBadgePopoverPosition,
  computeLegacyPopoverPosition,
  intersectionArea,
  rectFromPosition,
  unionBoundingRects,
  type Rect,
  type Viewport,
} from '../dayBadgePopoverPosition'

const VIEWPORT: Viewport = {
  offsetLeft: 0,
  offsetTop: 0,
  width: 390,
  height: 844,
}

function rect(
  left: number,
  top: number,
  width: number,
  height: number,
): Rect {
  return rectFromPosition(left, top, width, height)
}

const POPOVER_W = 272
const POPOVER_H = 360

describe('unionBoundingRects', () => {
  it('merges stacked grids into one avoid rect', () => {
    const grid1 = rect(20, 100, 350, 220)
    const grid2 = rect(20, 340, 350, 220)
    const union = unionBoundingRects([grid1, grid2])
    expect(union).toEqual({
      left: 20,
      top: 100,
      right: 370,
      bottom: 560,
      width: 350,
      height: 460,
    })
  })
})

describe('computeDayBadgePopoverPosition', () => {
  it('middle cell prefers low-overlap placement over right/left', () => {
    const avoidRect = rect(20, 80, 350, 480)
    const anchorRect = rect(175, 140, 44, 44)

    const result = computeDayBadgePopoverPosition({
      anchorRect,
      avoidRect,
      popoverWidth: POPOVER_W,
      popoverHeight: POPOVER_H,
      viewport: VIEWPORT,
    })

    expect(result.placement).not.toBe('right')
    expect(result.placement).not.toBe('left')
    const popoverRect = rectFromPosition(
      result.left,
      result.top,
      POPOVER_W,
      POPOVER_H,
    )
    const rightOverlap = intersectionArea(
      popoverRect,
      avoidRect,
    )
    expect(rightOverlap).toBeLessThan(
      intersectionArea(
        rectFromPosition(anchorRect.right + 8, anchorRect.top, POPOVER_W, POPOVER_H),
        avoidRect,
      ),
    )
  })

  it('top-right cell (e.g. day 27) picks outsideBelow with zero overlap', () => {
    const avoidRect = rect(16, 72, 358, 520)
    const anchorRect = rect(298, 108, 42, 42)
    const tallViewport: Viewport = {
      offsetLeft: 0,
      offsetTop: 0,
      width: 390,
      height: 980,
    }

    const result = computeDayBadgePopoverPosition({
      anchorRect,
      avoidRect,
      popoverWidth: POPOVER_W,
      popoverHeight: POPOVER_H,
      viewport: tallViewport,
    })

    expect(result.placement).toBe('outsideBelow')
    expect(result.top).toBeGreaterThanOrEqual(avoidRect.bottom + 8 - 1)
    const popoverRect = rectFromPosition(
      result.left,
      result.top,
      POPOVER_W,
      POPOVER_H,
    )
    expect(intersectionArea(popoverRect, avoidRect)).toBe(0)
  })

  it('prefers outsideTop when bottom viewport space is tight', () => {
    const avoidRect = rect(16, 400, 358, 280)
    const anchorRect = rect(298, 520, 42, 42)
    const tightViewport: Viewport = {
      offsetLeft: 0,
      offsetTop: 0,
      width: 390,
      height: 720,
    }

    const result = computeDayBadgePopoverPosition({
      anchorRect,
      avoidRect,
      popoverWidth: POPOVER_W,
      popoverHeight: POPOVER_H,
      viewport: tightViewport,
    })

    expect(result.placement).not.toBe('right')
    const popoverRect = rectFromPosition(
      result.left,
      result.top,
      POPOVER_W,
      POPOVER_H,
    )
    expect(intersectionArea(popoverRect, avoidRect)).toBe(0)
  })

  it('union avoid rect makes outsideBelow beat in-grid bottom', () => {
    const grid1 = rect(20, 80, 350, 220)
    const grid2 = rect(20, 320, 350, 220)
    const avoidRect = unionBoundingRects([grid1, grid2])!
    const anchorRect = rect(180, 120, 44, 44)

    const result = computeDayBadgePopoverPosition({
      anchorRect,
      avoidRect,
      popoverWidth: POPOVER_W,
      popoverHeight: POPOVER_H,
      viewport: { ...VIEWPORT, height: 980 },
    })

    expect(result.placement).toBe('outsideBelow')
    const popoverRect = rectFromPosition(
      result.left,
      result.top,
      POPOVER_W,
      POPOVER_H,
    )
    expect(intersectionArea(popoverRect, avoidRect)).toBe(0)
  })

  it('falls back to legacy when avoidRect is null', () => {
    const anchorRect = rect(200, 150, 44, 44)

    const smart = computeDayBadgePopoverPosition({
      anchorRect,
      avoidRect: null,
      popoverWidth: POPOVER_W,
      popoverHeight: POPOVER_H,
      viewport: VIEWPORT,
    })
    const legacy = computeLegacyPopoverPosition(
      anchorRect,
      POPOVER_W,
      POPOVER_H,
      VIEWPORT,
    )

    expect(smart).toEqual(legacy)
    expect(smart.placement).toBeUndefined()
  })
})

export const VIEWPORT_MARGIN = 12
export const GAP = 8

export interface Rect {
  left: number
  top: number
  right: number
  bottom: number
  width: number
  height: number
}

export interface Viewport {
  offsetLeft: number
  offsetTop: number
  width: number
  height: number
}

export type PopoverPlacement =
  | 'outsideBelow'
  | 'outsideTop'
  | 'bottom'
  | 'top'
  | 'right'
  | 'left'

const PLACEMENT_PRIORITY: Record<PopoverPlacement, number> = {
  outsideBelow: 0,
  outsideTop: 1,
  bottom: 2,
  top: 3,
  right: 4,
  left: 5,
}

const ALL_PLACEMENTS: PopoverPlacement[] = [
  'outsideBelow',
  'outsideTop',
  'bottom',
  'top',
  'right',
  'left',
]

export function clamp(value: number, min: number, max: number): number {
  if (max < min) return min
  return Math.min(Math.max(value, min), max)
}

export function unionBoundingRects(rects: Rect[]): Rect | null {
  if (rects.length === 0) return null
  let left = Infinity
  let top = Infinity
  let right = -Infinity
  let bottom = -Infinity
  for (const r of rects) {
    left = Math.min(left, r.left)
    top = Math.min(top, r.top)
    right = Math.max(right, r.right)
    bottom = Math.max(bottom, r.bottom)
  }
  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
  }
}

export function intersectionArea(a: Rect, b: Rect): number {
  const left = Math.max(a.left, b.left)
  const top = Math.max(a.top, b.top)
  const right = Math.min(a.right, b.right)
  const bottom = Math.min(a.bottom, b.bottom)
  if (right <= left || bottom <= top) return 0
  return (right - left) * (bottom - top)
}

export function rectFromPosition(
  left: number,
  top: number,
  width: number,
  height: number,
): Rect {
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
  }
}

export function domRectToRect(r: DOMRect): Rect {
  return {
    left: r.left,
    top: r.top,
    right: r.right,
    bottom: r.bottom,
    width: r.width,
    height: r.height,
  }
}

export function getDefaultViewport(): Viewport {
  const vv = typeof window !== 'undefined' ? window.visualViewport : null
  return {
    offsetLeft: vv?.offsetLeft ?? 0,
    offsetTop: vv?.offsetTop ?? 0,
    width: vv?.width ?? (typeof window !== 'undefined' ? window.innerWidth : 390),
    height:
      vv?.height ?? (typeof window !== 'undefined' ? window.innerHeight : 844),
  }
}

function clampToViewport(
  left: number,
  top: number,
  popoverWidth: number,
  popoverHeight: number,
  viewport: Viewport,
): { left: number; top: number } {
  const minLeft = viewport.offsetLeft + VIEWPORT_MARGIN
  const maxLeft =
    viewport.offsetLeft + viewport.width - popoverWidth - VIEWPORT_MARGIN
  const minTop = viewport.offsetTop + VIEWPORT_MARGIN
  const maxTop =
    viewport.offsetTop + viewport.height - popoverHeight - VIEWPORT_MARGIN
  return {
    left: clamp(left, minLeft, maxLeft),
    top: clamp(top, minTop, maxTop),
  }
}

export function computeLegacyPopoverPosition(
  anchorRect: Rect,
  popoverWidth: number,
  popoverHeight: number,
  viewport: Viewport = getDefaultViewport(),
): { left: number; top: number } {
  let preferredLeft = anchorRect.right + GAP
  let preferredTop = anchorRect.top

  if (
    preferredLeft + popoverWidth >
    viewport.offsetLeft + viewport.width - VIEWPORT_MARGIN
  ) {
    preferredLeft = anchorRect.left - GAP - popoverWidth
  }
  if (
    preferredTop + popoverHeight >
    viewport.offsetTop + viewport.height - VIEWPORT_MARGIN
  ) {
    preferredTop = anchorRect.bottom - popoverHeight
  }

  return clampToViewport(
    preferredLeft,
    preferredTop,
    popoverWidth,
    popoverHeight,
    viewport,
  )
}

function anchorCenterX(anchorRect: Rect): number {
  return anchorRect.left + anchorRect.width / 2
}

function candidateRawPosition(
  placement: PopoverPlacement,
  anchorRect: Rect,
  avoidRect: Rect,
  popoverWidth: number,
  popoverHeight: number,
): { left: number; top: number } {
  const cx = anchorCenterX(anchorRect)
  switch (placement) {
    case 'outsideBelow':
      return { left: cx - popoverWidth / 2, top: avoidRect.bottom + GAP }
    case 'outsideTop':
      return {
        left: cx - popoverWidth / 2,
        top: avoidRect.top - GAP - popoverHeight,
      }
    case 'bottom':
      return { left: cx - popoverWidth / 2, top: anchorRect.bottom + GAP }
    case 'top':
      return {
        left: cx - popoverWidth / 2,
        top: anchorRect.top - GAP - popoverHeight,
      }
    case 'right':
      return { left: anchorRect.right + GAP, top: anchorRect.top }
    case 'left':
      return {
        left: anchorRect.left - GAP - popoverWidth,
        top: anchorRect.top,
      }
  }
}

export function computeDayBadgePopoverPosition(params: {
  anchorRect: Rect
  avoidRect: Rect | null
  popoverWidth: number
  popoverHeight: number
  viewport?: Viewport
}): { left: number; top: number; placement?: PopoverPlacement } {
  const { anchorRect, avoidRect, popoverWidth, popoverHeight } = params
  const viewport = params.viewport ?? getDefaultViewport()

  if (!avoidRect) {
    return computeLegacyPopoverPosition(
      anchorRect,
      popoverWidth,
      popoverHeight,
      viewport,
    )
  }

  type Scored = {
    placement: PopoverPlacement
    left: number
    top: number
    overlapArea: number
  }

  const scored: Scored[] = ALL_PLACEMENTS.map((placement) => {
    const raw = candidateRawPosition(
      placement,
      anchorRect,
      avoidRect,
      popoverWidth,
      popoverHeight,
    )
    const clamped = clampToViewport(
      raw.left,
      raw.top,
      popoverWidth,
      popoverHeight,
      viewport,
    )
    const popoverRect = rectFromPosition(
      clamped.left,
      clamped.top,
      popoverWidth,
      popoverHeight,
    )
    return {
      placement,
      left: clamped.left,
      top: clamped.top,
      overlapArea: intersectionArea(popoverRect, avoidRect),
    }
  })

  scored.sort((a, b) => {
    if (a.overlapArea !== b.overlapArea) return a.overlapArea - b.overlapArea
    return PLACEMENT_PRIORITY[a.placement] - PLACEMENT_PRIORITY[b.placement]
  })

  const best = scored[0]
  return { left: best.left, top: best.top, placement: best.placement }
}

export function resolveAvoidRectFromAnchor(anchorEl: HTMLElement): Rect | null {
  const root = anchorEl.closest('[data-heatmap-root]')
  const grids = root
    ? Array.from(root.querySelectorAll('.responsive-calendar-grid'))
    : anchorEl.closest('.responsive-calendar-grid')
      ? [anchorEl.closest('.responsive-calendar-grid')!]
      : []

  if (grids.length === 0) return null

  const rects = grids.map((el) => domRectToRect(el.getBoundingClientRect()))
  return unionBoundingRects(rects)
}

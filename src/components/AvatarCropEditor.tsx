import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react'
import {
  clampAvatarCropPan,
  computeAvatarCropRect,
  type AvatarCropRect,
} from '../lib/avatarImage'

const MIN_ZOOM = 1
const MAX_ZOOM = 4

interface AvatarCropEditorProps {
  imageUrl: string
  imageWidth: number
  imageHeight: number
  onCropRectChange: (rect: AvatarCropRect) => void
}

export function AvatarCropEditor({
  imageUrl,
  imageWidth,
  imageHeight,
  onCropRectChange,
}: AvatarCropEditorProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [viewportSize, setViewportSize] = useState({ width: 280, height: 280 })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const zoomRef = useRef(zoom)
  const panRef = useRef(pan)
  zoomRef.current = zoom
  panRef.current = pan
  const panDragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    panX: number
    panY: number
  } | null>(null)
  const pinchRef = useRef<{
    startDistance: number
    startZoom: number
    startPanX: number
    startPanY: number
    centerX: number
    centerY: number
  } | null>(null)
  const activePointersRef = useRef(
    new Map<number, { clientX: number; clientY: number }>(),
  )

  const cropSide = Math.min(viewportSize.width, viewportSize.height)

  const buildView = useCallback(
    (nextZoom: number, nextPanX: number, nextPanY: number) => ({
      imageWidth,
      imageHeight,
      viewportWidth: viewportSize.width,
      viewportHeight: viewportSize.height,
      cropSide,
      zoom: nextZoom,
      panX: nextPanX,
      panY: nextPanY,
    }),
    [cropSide, imageHeight, imageWidth, viewportSize.height, viewportSize.width],
  )

  const applyTransform = useCallback(
    (nextZoom: number, nextPanX: number, nextPanY: number) => {
      const clampedZoom = Math.min(Math.max(nextZoom, MIN_ZOOM), MAX_ZOOM)
      const { panX, panY } = clampAvatarCropPan(
        buildView(clampedZoom, nextPanX, nextPanY),
      )
      setZoom(clampedZoom)
      setPan({ x: panX, y: panY })
      onCropRectChange(computeAvatarCropRect(buildView(clampedZoom, panX, panY)))
    },
    [buildView, onCropRectChange],
  )

  useEffect(() => {
    const node = viewportRef.current
    if (!node) return

    const updateSize = () => {
      const rect = node.getBoundingClientRect()
      const width = Math.max(1, Math.round(rect.width))
      const height = Math.max(1, Math.round(rect.height))
      setViewportSize({ width, height })
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    applyTransform(MIN_ZOOM, 0, 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when source image changes
  }, [imageHeight, imageWidth])

  useEffect(() => {
    applyTransform(zoomRef.current, panRef.current.x, panRef.current.y)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reclamp when viewport size changes
  }, [cropSide, viewportSize.width, viewportSize.height])

  const baseScale =
    imageWidth > 0 && imageHeight > 0
      ? Math.max(cropSide / imageWidth, cropSide / imageHeight)
      : 1
  const displayScale = baseScale * zoom
  const displayW = imageWidth * displayScale
  const displayH = imageHeight * displayScale

  const zoomAtPoint = useCallback(
    (nextZoom: number, clientX: number, clientY: number) => {
      const node = viewportRef.current
      if (!node) {
        applyTransform(nextZoom, pan.x, pan.y)
        return
      }
      const rect = node.getBoundingClientRect()
      const px = clientX - rect.left
      const py = clientY - rect.top
      const prevScale = baseScale * zoom
      const nextScale = baseScale * Math.min(Math.max(nextZoom, MIN_ZOOM), MAX_ZOOM)
      if (prevScale <= 0) {
        applyTransform(nextZoom, pan.x, pan.y)
        return
      }
      const imgLeft = (viewportSize.width - imageWidth * prevScale) / 2 + pan.x
      const imgTop = (viewportSize.height - imageHeight * prevScale) / 2 + pan.y
      const srcX = (px - imgLeft) / prevScale
      const srcY = (py - imgTop) / prevScale
      const nextImgLeft = px - srcX * nextScale
      const nextImgTop = py - srcY * nextScale
      const nextPanX = nextImgLeft - (viewportSize.width - imageWidth * nextScale) / 2
      const nextPanY = nextImgTop - (viewportSize.height - imageHeight * nextScale) / 2
      applyTransform(nextZoom, nextPanX, nextPanY)
    },
    [
      applyTransform,
      baseScale,
      imageHeight,
      imageWidth,
      pan.x,
      pan.y,
      viewportSize.height,
      viewportSize.width,
      zoom,
    ],
  )

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    const factor = Math.exp(-event.deltaY * (event.ctrlKey ? 0.004 : 0.002))
    zoomAtPoint(zoom * factor, event.clientX, event.clientY)
  }

  const syncPinch = () => {
    const pointers = [...activePointersRef.current.values()]
    if (pointers.length !== 2) return
    const [a, b] = pointers
    const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
    const centerX = (a.clientX + b.clientX) / 2
    const centerY = (a.clientY + b.clientY) / 2
    const pinch = pinchRef.current
    const node = viewportRef.current
    if (!pinch || pinch.startDistance <= 0 || !node) return

    const nextZoom = Math.min(
      Math.max(pinch.startZoom * (distance / pinch.startDistance), MIN_ZOOM),
      MAX_ZOOM,
    )
    const rect = node.getBoundingClientRect()
    const px = centerX - rect.left
    const py = centerY - rect.top
    const prevScale = baseScale * pinch.startZoom
    const nextScale = baseScale * nextZoom
    if (prevScale <= 0) return

    const imgLeft = (viewportSize.width - imageWidth * prevScale) / 2 + pinch.startPanX
    const imgTop = (viewportSize.height - imageHeight * prevScale) / 2 + pinch.startPanY
    const srcX = (px - imgLeft) / prevScale
    const srcY = (py - imgTop) / prevScale
    const nextImgLeft = px - srcX * nextScale
    const nextImgTop = py - srcY * nextScale
    const nextPanX =
      nextImgLeft - (viewportSize.width - imageWidth * nextScale) / 2
    const nextPanY =
      nextImgTop - (viewportSize.height - imageHeight * nextScale) / 2
    applyTransform(nextZoom, nextPanX, nextPanY)
  }

  const handleViewportPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    activePointersRef.current.set(event.pointerId, {
      clientX: event.clientX,
      clientY: event.clientY,
    })
    event.currentTarget.setPointerCapture(event.pointerId)

    if (activePointersRef.current.size === 2) {
      const pointers = [...activePointersRef.current.values()]
      const [a, b] = pointers
      pinchRef.current = {
        startDistance: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
        startZoom: zoom,
        startPanX: pan.x,
        startPanY: pan.y,
        centerX: (a.clientX + b.clientX) / 2,
        centerY: (a.clientY + b.clientY) / 2,
      }
      panDragRef.current = null
      return
    }

    if (activePointersRef.current.size === 1) {
      panDragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        panX: pan.x,
        panY: pan.y,
      }
    }
  }

  const handleViewportPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!activePointersRef.current.has(event.pointerId)) return
    activePointersRef.current.set(event.pointerId, {
      clientX: event.clientX,
      clientY: event.clientY,
    })

    if (activePointersRef.current.size >= 2) {
      syncPinch()
      return
    }

    const drag = panDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    applyTransform(
      zoom,
      drag.panX + (event.clientX - drag.startX),
      drag.panY + (event.clientY - drag.startY),
    )
  }

  const endPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    activePointersRef.current.delete(event.pointerId)
    if (panDragRef.current?.pointerId === event.pointerId) {
      panDragRef.current = null
    }
    if (activePointersRef.current.size < 2) {
      pinchRef.current = null
    }
    if (activePointersRef.current.size === 1) {
      const remaining = [...activePointersRef.current.entries()][0]
      if (remaining) {
        const [pointerId, point] = remaining
        panDragRef.current = {
          pointerId,
          startX: point.clientX,
          startY: point.clientY,
          panX: pan.x,
          panY: pan.y,
        }
      }
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  return (
    <div
      ref={viewportRef}
      className="settings-avatar-crop-modal__viewport"
      onWheel={handleWheel}
      onPointerDown={handleViewportPointerDown}
      onPointerMove={handleViewportPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
    >
      <img
        src={imageUrl}
        alt=""
        className="settings-avatar-crop-modal__image-layer"
        draggable={false}
        style={{
          width: `${displayW}px`,
          height: `${displayH}px`,
          transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px))`,
        }}
      />
      <div className="settings-avatar-crop-modal__frame" aria-hidden />
    </div>
  )
}

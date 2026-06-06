const MAX_EDGE = 256
const MAX_DATA_URL_LENGTH = 110_000
const LARGE_SOURCE_FILE_SIZE = 20 * 1024 * 1024
const LARGE_SOURCE_MAX_EDGE = 2048
const DEFAULT_SOURCE_MAX_EDGE = 4096
const JPEG_QUALITIES = [0.85, 0.75, 0.65, 0.55, 0.45] as const

export interface AvatarCropRect {
  x: number
  y: number
  size: number
}

export interface AvatarCropViewState {
  imageWidth: number
  imageHeight: number
  viewportWidth: number
  viewportHeight: number
  cropSide: number
  zoom: number
  panX: number
  panY: number
}

/** 根据视口内缩放/平移计算源图像 1:1 裁剪区域 */
export function computeAvatarCropRect(view: AvatarCropViewState): AvatarCropRect {
  const { imageWidth: wn, imageHeight: hn, viewportWidth: wv, viewportHeight: hv } =
    view
  const cropSide = view.cropSide
  const baseScale = Math.max(cropSide / wn, cropSide / hn)
  const displayScale = baseScale * view.zoom
  const imgW = wn * displayScale
  const imgH = hn * displayScale
  const cropLeft = (wv - cropSide) / 2
  const cropTop = (hv - cropSide) / 2
  const imgLeft = (wv - imgW) / 2 + view.panX
  const imgTop = (hv - imgH) / 2 + view.panY

  const maxSize = Math.max(1, Math.min(wn, hn))
  let size = cropSide / displayScale
  size = Math.min(Math.max(size, 1), maxSize)
  const maxX = Math.max(0, wn - size)
  const maxY = Math.max(0, hn - size)
  const x = Math.min(Math.max((cropLeft - imgLeft) / displayScale, 0), maxX)
  const y = Math.min(Math.max((cropTop - imgTop) / displayScale, 0), maxY)

  return { x, y, size }
}

/** 限制平移，保证裁剪框内始终有图像覆盖 */
export function clampAvatarCropPan(view: AvatarCropViewState): {
  panX: number
  panY: number
} {
  const { imageWidth: wn, imageHeight: hn, viewportWidth: wv, viewportHeight: hv } =
    view
  const cropSide = view.cropSide
  const baseScale = Math.max(cropSide / wn, cropSide / hn)
  const displayScale = baseScale * view.zoom
  const imgW = wn * displayScale
  const imgH = hn * displayScale
  const cropLeft = (wv - cropSide) / 2
  const cropTop = (hv - cropSide) / 2

  let imgLeft = (wv - imgW) / 2 + view.panX
  let imgTop = (hv - imgH) / 2 + view.panY
  const minLeft = cropLeft + cropSide - imgW
  const maxLeft = cropLeft
  const minTop = cropTop + cropSide - imgH
  const maxTop = cropTop
  imgLeft = Math.min(Math.max(imgLeft, minLeft), maxLeft)
  imgTop = Math.min(Math.max(imgTop, minTop), maxTop)

  return {
    panX: imgLeft - (wv - imgW) / 2,
    panY: imgTop - (hv - imgH) / 2,
  }
}

export function assertAvatarFile(file: File): void {
  if (!file.type.startsWith('image/')) {
    throw new Error('请选择图片文件')
  }
}

interface AvatarCanvas {
  toDataURL(type?: string, quality?: number): string
}

/** 从清晰度优先开始逐级压缩，确保符合头像 API 上限。 */
export function canvasToAvatarDataUrl(canvas: AvatarCanvas): string {
  for (const quality of JPEG_QUALITIES) {
    const dataUrl = canvas.toDataURL('image/jpeg', quality)
    if (dataUrl.length <= MAX_DATA_URL_LENGTH) return dataUrl
  }
  throw new Error('图片压缩后仍过大，请换一张更小的照片')
}

export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('无法读取图片'))
    }
    img.src = url
  })
}

export function calculateAvatarSourceSize(
  width: number,
  height: number,
  fileSize: number,
): { width: number; height: number; shouldResize: boolean } {
  const maxEdge =
    fileSize > LARGE_SOURCE_FILE_SIZE
      ? LARGE_SOURCE_MAX_EDGE
      : DEFAULT_SOURCE_MAX_EDGE
  const scale = Math.min(1, maxEdge / Math.max(width, height))
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    shouldResize: scale < 1 || fileSize > LARGE_SOURCE_FILE_SIZE,
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('无法压缩图片'))
      },
      type,
      quality,
    )
  })
}

/** 将大文件或超高分辨率图片先降采样，避免原图大小阻止头像裁剪。 */
export async function prepareAvatarFile(file: File): Promise<File> {
  assertAvatarFile(file)
  const img = await loadImage(file)
  const target = calculateAvatarSourceSize(img.width, img.height, file.size)
  if (!target.shouldResize) return file

  const canvas = document.createElement('canvas')
  canvas.width = target.width
  canvas.height = target.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法处理图片')

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, target.width, target.height)
  const blob = await canvasToBlob(canvas, 'image/jpeg', 0.9)
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'avatar'
  return new File([blob], `${baseName}.jpg`, {
    type: 'image/jpeg',
    lastModified: file.lastModified,
  })
}

/** 将用户选择的图片压缩为可 PATCH 的 JPEG data URL */
export async function fileToAvatarDataUrl(file: File): Promise<string> {
  assertAvatarFile(file)

  const img = await loadImage(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height))
  const w = Math.max(1, Math.round(img.width * scale))
  const h = Math.max(1, Math.round(img.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法处理图片')

  ctx.drawImage(img, 0, 0, w, h)
  return canvasToAvatarDataUrl(canvas)
}

/** 按 1:1 裁剪框导出头像 JPEG data URL */
export async function fileToCroppedAvatarDataUrl(
  file: File,
  cropRect: AvatarCropRect,
): Promise<string> {
  assertAvatarFile(file)
  const img = await loadImage(file)

  const maxCropSize = Math.max(1, Math.min(img.width, img.height))
  const rawSize = Math.round(cropRect.size)
  const size = Math.min(Math.max(rawSize, 1), maxCropSize)
  const maxX = Math.max(0, img.width - size)
  const maxY = Math.max(0, img.height - size)
  const sx = Math.min(Math.max(Math.round(cropRect.x), 0), maxX)
  const sy = Math.min(Math.max(Math.round(cropRect.y), 0), maxY)

  const canvas = document.createElement('canvas')
  canvas.width = MAX_EDGE
  canvas.height = MAX_EDGE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法处理图片')

  ctx.drawImage(img, sx, sy, size, size, 0, 0, MAX_EDGE, MAX_EDGE)
  return canvasToAvatarDataUrl(canvas)
}

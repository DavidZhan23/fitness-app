const MAX_EDGE = 256
const JPEG_QUALITY = 0.85
const MAX_DATA_URL_LENGTH = 110_000

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

function assertAvatarFile(file: File): void {
  if (!file.type.startsWith('image/')) {
    throw new Error('请选择图片文件')
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error('图片过大，请选择 8MB 以内的文件')
  }
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
  const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
  if (dataUrl.length > MAX_DATA_URL_LENGTH) {
    throw new Error('图片压缩后仍过大，请换一张更小的照片')
  }
  return dataUrl
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
  const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
  if (dataUrl.length > MAX_DATA_URL_LENGTH) {
    throw new Error('图片压缩后仍过大，请换一张更小的照片')
  }
  return dataUrl
}

const MAX_EDGE = 1024
const JPEG_QUALITY = 0.78
const MAX_DATA_URL_LENGTH = 520_000

const IMAGE_EXT_PATTERN = /\.(jpe?g|png|webp|heic|heif|gif|bmp|avif)$/i

function isLikelyImageFile(file: File): boolean {
  const type = file.type.trim().toLowerCase()
  if (type.startsWith('image/')) return true
  if (type === '' || type === 'application/octet-stream') {
    return IMAGE_EXT_PATTERN.test(file.name)
  }
  return false
}

function assertMealPhotoFile(file: File): void {
  if (!isLikelyImageFile(file)) {
    throw new Error('请选择图片文件（支持 JPG、PNG、HEIC 等）')
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error('图片过大，请选择 12MB 以内的照片')
  }
  if (file.size === 0) {
    throw new Error('图片文件为空，请重新选择')
  }
}

export function loadMealPhotoImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      if (img.width < 1 || img.height < 1) {
        reject(new Error('无法读取图片尺寸，请换一张照片'))
        return
      }
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(
        new Error(
          '无法读取该图片，请换 JPG/PNG 格式，或在相册中选「兼容性最佳」后再试',
        ),
      )
    }
    img.src = url
  })
}

/** 压缩餐食照片为 JPEG data URL，供 AI 识别上传 */
export async function fileToMealPhotoDataUrl(file: File): Promise<string> {
  assertMealPhotoFile(file)

  const img = await loadMealPhotoImage(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height))
  const w = Math.max(1, Math.round(img.width * scale))
  const h = Math.max(1, Math.round(img.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法处理图片')

  ctx.drawImage(img, 0, 0, w, h)

  let quality = JPEG_QUALITY
  let dataUrl = canvas.toDataURL('image/jpeg', quality)
  while (dataUrl.length > MAX_DATA_URL_LENGTH && quality > 0.45) {
    quality -= 0.08
    dataUrl = canvas.toDataURL('image/jpeg', quality)
  }

  if (dataUrl.length > MAX_DATA_URL_LENGTH) {
    throw new Error('图片压缩后仍过大，请换一张更近、更简单的照片')
  }

  return dataUrl
}

export function mealPhotoPreviewUrl(dataUrl: string): string {
  return dataUrl
}

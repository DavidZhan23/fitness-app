const MAX_EDGE = 256
const JPEG_QUALITY = 0.85
const MAX_DATA_URL_LENGTH = 110_000

function loadImage(file: File): Promise<HTMLImageElement> {
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
  if (!file.type.startsWith('image/')) {
    throw new Error('请选择图片文件')
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error('图片过大，请选择 8MB 以内的文件')
  }

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

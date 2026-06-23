import type { UserWeeklyReport } from '../types'

function imageFileName(report: UserWeeklyReport) {
  return `小满周报-第${report.weekNumber}周.jpg`
}

function isVisibleColor(color: string) {
  return Boolean(color && color !== 'transparent' && color !== 'rgba(0, 0, 0, 0)')
}

function safeBackgroundColor(source: Element, computed: CSSStyleDeclaration): string {
  if (isVisibleColor(computed.backgroundColor)) {
    return computed.backgroundColor
  }

  let node: Element | null = source.parentElement
  while (node) {
    const parentBg = window.getComputedStyle(node).backgroundColor
    if (isVisibleColor(parentBg)) return parentBg
    node = node.parentElement
  }

  const pageBg = window.getComputedStyle(document.body).backgroundColor
  return isVisibleColor(pageBg) ? pageBg : '#0f172a'
}

function resolveCaptureBackground(root: HTMLElement) {
  return safeBackgroundColor(root, window.getComputedStyle(root))
}

async function waitForCaptureReady(root: HTMLElement) {
  root.scrollIntoView({ block: 'start', inline: 'nearest' })
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
  if ('fonts' in document) {
    await document.fonts.ready
  }
  await Promise.all(
    Array.from(root.querySelectorAll('img')).map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve()
            return
          }
          img.addEventListener('load', () => resolve(), { once: true })
          img.addEventListener('error', () => resolve(), { once: true })
        }),
    ),
  )
}

function downloadImageBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export async function generateWeeklyReportImage(captureRoot: HTMLElement): Promise<Blob> {
  const { domToBlob } = await import('modern-screenshot')

  await waitForCaptureReady(captureRoot)

  const scale = Math.min(2, window.devicePixelRatio || 2)
  const blob = await domToBlob(captureRoot, {
    scale,
    type: 'image/jpeg',
    quality: 0.92,
    backgroundColor: resolveCaptureBackground(captureRoot),
    filter: (node) => {
      if (node instanceof Element && node.hasAttribute('data-weekly-report-capture-skip')) {
        return false
      }
      return true
    },
  })

  if (!blob) {
    throw new Error('长图生成失败，请刷新后重试')
  }

  return blob
}

export type WeeklyReportImageShareResult = 'shared' | 'downloaded'

export async function shareWeeklyReportImage(
  report: UserWeeklyReport,
  captureRoot?: HTMLElement | null,
): Promise<WeeklyReportImageShareResult> {
  const root =
    captureRoot ?? document.querySelector<HTMLElement>('[data-weekly-report-capture]')
  if (!root) {
    throw new Error('找不到周报内容，请刷新后重试')
  }

  const blob = await generateWeeklyReportImage(root)
  const filename = imageFileName(report)
  const file = new File([blob], filename, { type: 'image/jpeg' })
  const shareData = {
    title: '小满周报',
    text: `${report.summary.overallTitle} · 第 ${report.weekNumber} 周`,
    files: [file],
  }

  if (typeof navigator.share === 'function') {
    try {
      if (!navigator.canShare || navigator.canShare(shareData)) {
        await navigator.share(shareData)
        return 'shared'
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw err
      }
    }
  }

  downloadImageBlob(blob, filename)
  return 'downloaded'
}

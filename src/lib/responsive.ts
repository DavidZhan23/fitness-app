export const RESPONSIVE_VIEWPORTS = [
  { name: 'iphone-se-legacy', width: 320, height: 568 },
  { name: 'android-narrow', width: 360, height: 640 },
  { name: 'iphone-se', width: 375, height: 667 },
  { name: 'iphone-12', width: 390, height: 844 },
  { name: 'pixel-7', width: 412, height: 915 },
  { name: 'iphone-14-pro-max', width: 430, height: 932 },
  { name: 'tablet-portrait', width: 768, height: 1024 },
  { name: 'desktop-smoke', width: 1440, height: 900 },
] as const

export type ResponsiveViewportName =
  (typeof RESPONSIVE_VIEWPORTS)[number]['name']

export function fluidClamp(minPx: number, vw: number, maxPx: number): string {
  return `clamp(${minPx}px, ${vw}vw, ${maxPx}px)`
}

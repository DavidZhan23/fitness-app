import { devices, type PlaywrightTestOptions } from '@playwright/test'

export interface MobileViewportPreset {
  name: string
  device: PlaywrightTestOptions
}

/** Viewport-only presets (no defaultBrowserType — safe inside describe). */
function mobileViewportFrom(deviceName: keyof typeof devices): PlaywrightTestOptions {
  const preset = devices[deviceName]
  return {
    viewport: preset.viewport,
    userAgent: preset.userAgent,
    deviceScaleFactor: preset.deviceScaleFactor,
    isMobile: preset.isMobile,
    hasTouch: preset.hasTouch,
  }
}

export const MOBILE_VIEWPORTS: MobileViewportPreset[] = [
  { name: 'iphone-se', device: mobileViewportFrom('iPhone SE') },
  { name: 'pixel-5', device: mobileViewportFrom('Pixel 5') },
  {
    name: 'iphone-14-pro-max',
    device: mobileViewportFrom('iPhone 14 Pro Max'),
  },
  { name: 'galaxy-s8', device: mobileViewportFrom('Galaxy S8') },
]

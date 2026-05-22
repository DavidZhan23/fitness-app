/** PWA 主屏幕图标角标（iOS 16.4+ / Android 等支持 Badging API 的环境） */
type BadgingNavigator = Navigator & {
  setAppBadge: (count?: number) => Promise<void>
  clearAppBadge?: () => Promise<void>
}

function badgingNavigator(): BadgingNavigator | null {
  if (!('setAppBadge' in navigator)) return null
  return navigator as BadgingNavigator
}

export async function syncAppIconBadge(count: number) {
  const nav = badgingNavigator()
  if (!nav) return
  try {
    if (count > 0) {
      await nav.setAppBadge(Math.min(count, 99))
    } else if (typeof nav.clearAppBadge === 'function') {
      await nav.clearAppBadge()
    } else {
      await nav.setAppBadge(0)
    }
  } catch {
    /* 不支持或用户未安装到主屏幕 */
  }
}

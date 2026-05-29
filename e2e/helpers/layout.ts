import { expect, type Locator, type Page } from '@playwright/test'

const OVERFLOW_TOLERANCE_PX = 1
const VIEWPORT_EDGE_TOLERANCE_PX = 2
const TABBAR_CONTENT_GAP_PX = 8

export type OverflowLayer = 'documentElement' | 'body' | 'app-main' | 'page-standalone'

export async function collectHorizontalOverflow(
  page: Page,
  layers: OverflowLayer[],
): Promise<string[]> {
  return page.evaluate(
    ({ layerNames, tolerance }) => {
      const issues: string[] = []
      const check = (el: Element | null, name: string) => {
        if (!el) return
        const scrollWidth = el.scrollWidth
        const clientWidth = el.clientWidth
        if (scrollWidth > clientWidth + tolerance) {
          issues.push(
            `${name}: scrollWidth ${scrollWidth} > clientWidth ${clientWidth} (+${scrollWidth - clientWidth}px)`,
          )
        }
      }
      for (const name of layerNames) {
        if (name === 'documentElement') {
          check(document.documentElement, 'documentElement')
        } else if (name === 'body') {
          check(document.body, 'body')
        } else if (name === 'app-main') {
          check(document.querySelector('.app-main'), '.app-main')
        } else if (name === 'page-standalone') {
          check(document.querySelector('.page-standalone'), '.page-standalone')
        }
      }
      return issues
    },
    { layerNames: layers, tolerance: OVERFLOW_TOLERANCE_PX },
  )
}

export async function assertNoHorizontalOverflow(
  page: Page,
  routeLabel: string,
  layers: OverflowLayer[] = ['documentElement', 'body', 'app-main'],
) {
  const issues = await collectHorizontalOverflow(page, layers)
  expect(
    issues,
    `${routeLabel}: horizontal overflow\n${issues.join('\n')}`,
  ).toEqual([])
}

export async function assertStandaloneNoHorizontalOverflow(
  page: Page,
  routeLabel: string,
) {
  await assertNoHorizontalOverflow(page, routeLabel, [
    'documentElement',
    'body',
    'page-standalone',
  ])
}

export async function assertLayoutShell(page: Page, routeLabel: string) {
  await assertNoHorizontalOverflow(page, routeLabel)
  await assertTabbarInViewport(page)
}

/** Detect visible descendants wider than the viewport (overflow-x:hidden can hide these). */
export async function assertNoDescendantWiderThanViewport(
  page: Page,
  rootSelector: string,
  routeLabel: string,
) {
  const viewport = page.viewportSize()
  expect(viewport).not.toBeNull()
  const maxRight = viewport!.width + VIEWPORT_EDGE_TOLERANCE_PX

  const offenders = await page.evaluate(
    ({ selector, maxRight: limit }) => {
      const root = document.querySelector(selector)
      if (!root) return [] as string[]
      const issues: string[] = []
      const nodes = root.querySelectorAll('*')
      nodes.forEach((el) => {
        if (!(el instanceof HTMLElement)) return
        const style = getComputedStyle(el)
        if (style.display === 'none' || style.visibility === 'hidden') return
        const rect = el.getBoundingClientRect()
        if (rect.width < 1 || rect.height < 1) return
        if (rect.right > limit) {
          const tag = `${el.tagName.toLowerCase()}${el.className ? `.${String(el.className).split(/\s+/).slice(0, 2).join('.')}` : ''}`
          issues.push(
            `${tag}: right=${rect.right.toFixed(1)} > viewport ${limit}`,
          )
        }
      })
      return issues.slice(0, 8)
    },
    { selector: rootSelector, maxRight },
  )

  expect(
    offenders,
    `${routeLabel}: elements wider than viewport\n${offenders.join('\n')}`,
  ).toEqual([])
}

/**
 * Scroll .app-main to the bottom, then assert content sits above the fixed tabbar.
 */
export async function assertContentClearOfTabbar(
  page: Page,
  locator: Locator,
  label: string,
  gapPx = TABBAR_CONTENT_GAP_PX,
) {
  const main = page.locator('.app-main')
  await expect(main, `${label}: .app-main`).toBeVisible()
  await main.evaluate((el) => {
    el.scrollTop = el.scrollHeight - el.clientHeight
  })

  await expect(locator, `${label} should be visible`).toBeVisible()

  const tabbar = await page.locator('.app-tabbar').boundingBox()
  const box = await locator.boundingBox()
  expect(tabbar, `${label}: .app-tabbar bounding box`).not.toBeNull()
  expect(box, `${label} content bounding box`).not.toBeNull()

  const contentBottom = box!.y + box!.height
  const maxBottom = tabbar!.y - gapPx
  expect(
    contentBottom,
    `${label} bottom ${contentBottom.toFixed(1)} should be <= tabbar top ${tabbar!.y.toFixed(1)} - ${gapPx} (max ${maxBottom.toFixed(1)})`,
  ).toBeLessThanOrEqual(maxBottom + OVERFLOW_TOLERANCE_PX)
}

export async function assertTabbarInViewport(page: Page) {
  const tabbar = page.locator('.app-tabbar')
  await expect(tabbar).toBeVisible()

  const viewport = page.viewportSize()
  expect(viewport, 'viewport size must be set').not.toBeNull()

  const box = await tabbar.boundingBox()
  expect(box, '.app-tabbar bounding box').not.toBeNull()

  const vp = viewport!
  const bottom = box!.y + box!.height
  expect(
    bottom,
    `.app-tabbar bottom ${bottom} should be within viewport height ${vp.height}`,
  ).toBeLessThanOrEqual(vp.height + VIEWPORT_EDGE_TOLERANCE_PX)

  expect(
    box!.x,
    `.app-tabbar left ${box!.x} should not extend past viewport`,
  ).toBeGreaterThanOrEqual(-VIEWPORT_EDGE_TOLERANCE_PX)

  const right = box!.x + box!.width
  expect(
    right,
    `.app-tabbar right ${right} should be within viewport width ${vp.width}`,
  ).toBeLessThanOrEqual(vp.width + VIEWPORT_EDGE_TOLERANCE_PX)
}

/**
 * After scrolling into view, assert the locator is not clipped horizontally and
 * intersects the visible scrollport (viewport area above the tabbar, or full
 * viewport on standalone pages).
 */
export async function assertLocatorInScrollport(
  page: Page,
  locator: Locator,
  label: string,
  options: { standalone?: boolean } = {},
) {
  await expect(locator, `${label} should be visible`).toBeVisible()
  await locator.evaluate((el) =>
    el.scrollIntoView({ block: 'center', inline: 'nearest' }),
  )

  const viewport = page.viewportSize()
  expect(viewport, 'viewport size must be set').not.toBeNull()
  const vp = viewport!

  const box = await locator.boundingBox()
  expect(box, `${label} bounding box`).not.toBeNull()

  const left = box!.x
  const right = box!.x + box!.width
  expect(
    left,
    `${label} left ${left} should be within viewport width ${vp.width}`,
  ).toBeGreaterThanOrEqual(-VIEWPORT_EDGE_TOLERANCE_PX)
  expect(
    right,
    `${label} right ${right} should be within viewport width ${vp.width}`,
  ).toBeLessThanOrEqual(vp.width + VIEWPORT_EDGE_TOLERANCE_PX)

  const scrollRoot = options.standalone
    ? page.locator('.page-standalone')
    : page.locator('.app-main')
  const scrollRootBox = await scrollRoot.boundingBox()
  let scrollportTop = 0
  let scrollportBottom = vp.height
  if (scrollRootBox) {
    scrollportTop = scrollRootBox.y
    scrollportBottom = scrollRootBox.y + scrollRootBox.height
  }

  const top = box!.y
  const bottom = box!.y + box!.height
  const intersectsVertically =
    bottom > scrollportTop + VIEWPORT_EDGE_TOLERANCE_PX &&
    top < scrollportBottom + VIEWPORT_EDGE_TOLERANCE_PX

  expect(
    intersectsVertically,
    `${label} should intersect scrollport [${scrollportTop}, ${scrollportBottom}] (got top=${top}, bottom=${bottom})`,
  ).toBe(true)
}

import { expect, type Locator, type Page } from '@playwright/test'

const OVERFLOW_TOLERANCE_PX = 1
const VIEWPORT_EDGE_TOLERANCE_PX = 2

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

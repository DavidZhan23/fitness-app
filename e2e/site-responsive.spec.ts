import { test, expect } from '@playwright/test'
import { RESPONSIVE_VIEWPORTS } from '../src/lib/responsive'
import { registerAndOnboard, uniqueE2eEmail } from './helpers/auth'
import { logExercise } from './helpers/flows'
import {
  assertContentClearOfTabbar,
  assertLayoutShell,
  assertLocatorInScrollport,
  assertNoDescendantWiderThanViewport,
  assertStandaloneNoHorizontalOverflow,
} from './helpers/layout'

type SiteRoute = {
  name: string
  path: string
  standalone?: boolean
  anchors: Array<{
    label: string
    getLocator: (page: import('@playwright/test').Page) => import('@playwright/test').Locator
  }>
  bottomAnchor?: {
    label: string
    getLocator: (page: import('@playwright/test').Page) => import('@playwright/test').Locator
  }
}

const SITE_ROUTES: SiteRoute[] = [
  {
    name: 'today',
    path: '/',
    anchors: [
      { label: '欢迎语', getLocator: (p) => p.locator('.hero-greeting') },
      { label: '缺口主卡', getLocator: (p) => p.locator('.theme-deficit-card') },
      {
        label: '记运动',
        getLocator: (p) => p.getByRole('link', { name: '+ 记运动' }),
      },
    ],
  },
  {
    name: 'calendar',
    path: '/calendar',
    anchors: [
      {
        label: '打卡墙',
        getLocator: (p) => p.getByRole('heading', { name: '打卡墙' }),
      },
      {
        label: '连续统计',
        getLocator: (p) => p.locator('.calendar-stat-card').first(),
      },
    ],
    bottomAnchor: {
      label: '返回今日',
      getLocator: (p) => p.getByRole('link', { name: '返回今日' }),
    },
  },
  {
    name: 'community',
    path: '/community',
    anchors: [
      {
        label: '社区标题',
        getLocator: (p) => p.getByRole('heading', { name: '社区', exact: true }),
      },
      {
        label: '全部 tab',
        getLocator: (p) => p.getByRole('tab', { name: '全部', exact: true }),
      },
    ],
    bottomAnchor: {
      label: '底部设置链接',
      getLocator: (p) =>
        p.getByRole('link', { name: /在设置中管理昵称/ }),
    },
  },
  {
    name: 'templates',
    path: '/templates',
    anchors: [
      {
        label: '我的模板',
        getLocator: (p) => p.getByRole('heading', { name: '我的模板' }),
      },
    ],
    bottomAnchor: {
      label: '最后一张模板卡',
      getLocator: (p) => p.locator('.app-main__inner ul li .responsive-list-card').last(),
    },
  },
  {
    name: 'settings',
    path: '/settings',
    anchors: [
      {
        label: '设置',
        getLocator: (p) => p.getByRole('heading', { name: '设置' }),
      },
    ],
    bottomAnchor: {
      label: '退出登录',
      getLocator: (p) => p.getByRole('button', { name: '退出登录' }),
    },
  },
  {
    name: 'log-exercise',
    path: '/log/exercise',
    standalone: true,
    anchors: [
      {
        label: '保存',
        getLocator: (p) => p.getByRole('button', { name: '保存' }),
      },
    ],
  },
]

for (const viewport of RESPONSIVE_VIEWPORTS) {
  test.describe.serial(`site responsive @ ${viewport.name}`, () => {
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
    })

    test('main routes fit viewport', async ({ page }) => {
      test.setTimeout(90_000)

      await registerAndOnboard(page, uniqueE2eEmail())
      await logExercise(page, 'E2E site layout 运动', '120')

      for (const route of SITE_ROUTES) {
        await page.goto(route.path)
        await page.waitForLoadState('networkidle')

        const label = `${viewport.name} ${route.name}`

        if (route.standalone) {
          await assertStandaloneNoHorizontalOverflow(page, label)
        } else {
          await assertLayoutShell(page, label)
          await assertNoDescendantWiderThanViewport(
            page,
            '.app-main__inner',
            label,
          )
        }

        for (const anchor of route.anchors) {
          await assertLocatorInScrollport(
            page,
            anchor.getLocator(page),
            `${label} ${anchor.label}`,
            { standalone: route.standalone },
          )
        }

        if (route.bottomAnchor) {
          if (route.name === 'templates') {
            const cards = page.locator(
              '.app-main__inner ul li .responsive-list-card',
            )
            await expect(cards.first()).toBeVisible()
          }
          await assertContentClearOfTabbar(
            page,
            route.bottomAnchor.getLocator(page),
            `${label} ${route.bottomAnchor.label}`,
          )
        }
      }
    })
  })
}

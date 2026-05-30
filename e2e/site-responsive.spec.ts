import { test, expect } from '@playwright/test'
import { RESPONSIVE_VIEWPORTS } from '../src/lib/responsive'
import { registerAndOnboard, uniqueE2eEmail } from './helpers/auth'
import { logExercise, communityPageTitle } from './helpers/flows'
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
        getLocator: (p) => communityPageTitle(p),
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

    test('login register layout', async ({ page }) => {
      await page.goto('/login')
      await page.waitForLoadState('networkidle')
      await page.getByRole('button', { name: '没有账号？注册' }).click()

      const label = `${viewport.name} login-register`
      await assertStandaloneNoHorizontalOverflow(page, label)

      const email = page.getByPlaceholder('you@example.com')
      const password = page.getByPlaceholder('至少 6 位')
      const registrationKey = page.getByPlaceholder('请输入邀请密钥')
      const submit = page.getByRole('button', { name: '注册', exact: true })

      await expect(email).toBeVisible()
      await expect(password).toBeVisible()
      await expect(registrationKey).toBeVisible()
      await expect(submit).toBeVisible()

      const emailBox = await email.boundingBox()
      const passwordBox = await password.boundingBox()
      const registrationKeyBox = await registrationKey.boundingBox()
      const submitBox = await submit.boundingBox()

      expect(emailBox, `${label} email box`).not.toBeNull()
      expect(passwordBox, `${label} password box`).not.toBeNull()
      expect(registrationKeyBox, `${label} registration key box`).not.toBeNull()
      expect(submitBox, `${label} submit box`).not.toBeNull()

      expect(
        emailBox!.y,
        `${label} email should be above password`,
      ).toBeLessThan(passwordBox!.y)
      expect(
        passwordBox!.y,
        `${label} password should be above registration key`,
      ).toBeLessThan(registrationKeyBox!.y)
      expect(
        registrationKeyBox!.y,
        `${label} registration key should be above submit`,
      ).toBeLessThan(submitBox!.y)

      const minFieldWidth = viewport.width * 0.6
      expect(
        emailBox!.width,
        `${label} email width should not collapse`,
      ).toBeGreaterThanOrEqual(minFieldWidth)
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

        if (route.name === 'settings') {
          await expect(page.getByLabel('昵称')).toBeVisible()
          await expect(page.locator('input[type="file"]')).toBeHidden()

          const nickname = page.getByLabel('昵称')
          const welcomeTitle = page.getByLabel('自定义首页标题')
          const nicknameBox = await nickname.boundingBox()
          const welcomeTitleBox = await welcomeTitle.boundingBox()
          expect(nicknameBox, `${label} nickname box`).not.toBeNull()
          expect(welcomeTitleBox, `${label} welcome title box`).not.toBeNull()
          expect(
            nicknameBox!.y,
            `${label} nickname should be above welcome title`,
          ).toBeLessThan(welcomeTitleBox!.y)
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

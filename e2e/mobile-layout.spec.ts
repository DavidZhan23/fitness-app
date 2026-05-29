import { test, expect } from '@playwright/test'
import { MOBILE_VIEWPORTS } from './fixtures/mobile-viewports'
import { mainNav, registerAndOnboard, uniqueE2eEmail } from './helpers/auth'
import { logExercise, communityPageMarker, communityPageTitle } from './helpers/flows'
import {
  assertLocatorInScrollport,
  assertNoHorizontalOverflow,
  assertStandaloneNoHorizontalOverflow,
  assertTabbarInViewport,
} from './helpers/layout'

async function assertLayoutShell(page: import('@playwright/test').Page, routeLabel: string) {
  await assertNoHorizontalOverflow(page, routeLabel)
  await assertTabbarInViewport(page)
}

for (const viewport of MOBILE_VIEWPORTS) {
  test.describe.serial(`mobile layout @ ${viewport.name}`, () => {
    test.use(viewport.device)

    test('core routes fit viewport', async ({ page }) => {
      await registerAndOnboard(page, uniqueE2eEmail())
      await logExercise(page, 'E2E 布局检查运动', '180')

      const nav = mainNav(page)

      // Today
      await nav.getByRole('link', { name: '今日' }).click()
      await expect(page.getByRole('link', { name: '+ 记运动' })).toBeVisible()
      await assertLayoutShell(page, `${viewport.name} /`)
      await assertLocatorInScrollport(
        page,
        page.getByRole('link', { name: '+ 记运动' }),
        '今日 + 记运动',
      )
      await assertLocatorInScrollport(
        page,
        page.getByRole('link', { name: '+ 记饮食' }),
        '今日 + 记饮食',
      )

      // Calendar
      await nav.getByRole('link', { name: '打卡' }).click()
      await expect(page.getByRole('heading', { name: '打卡墙' })).toBeVisible()
      await assertLayoutShell(page, `${viewport.name} /calendar`)
      await assertLocatorInScrollport(
        page,
        page.getByRole('heading', { name: '打卡墙' }),
        '打卡墙标题',
      )

      // Community
      await nav.getByRole('link', { name: '社区' }).click()
      await expect(communityPageMarker(page)).toBeVisible()
      await assertLayoutShell(page, `${viewport.name} /community`)
      await assertLocatorInScrollport(
        page,
        communityPageTitle(page),
        '社区标题',
      )
      await assertLocatorInScrollport(
        page,
        page.getByRole('tab', { name: '全部', exact: true }),
        '社区 全部 tab',
      )

      // Templates
      await nav.getByRole('link', { name: '模板' }).click()
      await expect(page.getByRole('heading', { name: '我的模板' })).toBeVisible()
      await assertLayoutShell(page, `${viewport.name} /templates`)
      await assertLocatorInScrollport(
        page,
        page.getByRole('heading', { name: '我的模板' }),
        '我的模板标题',
      )

      // Settings
      await nav.getByRole('link', { name: '设置' }).click()
      await expect(page.getByRole('heading', { name: '设置' })).toBeVisible()
      await assertLayoutShell(page, `${viewport.name} /settings`)
      await assertLocatorInScrollport(
        page,
        page.getByRole('heading', { name: '设置' }),
        '设置标题',
      )

      // Log exercise (standalone shell, no tabbar)
      await nav.getByRole('link', { name: '今日' }).click()
      await page.getByRole('link', { name: '+ 记运动' }).click()
      await expect(page.getByRole('heading', { name: '记运动' })).toBeVisible()
      await assertStandaloneNoHorizontalOverflow(
        page,
        `${viewport.name} /log/exercise`,
      )
      await assertLocatorInScrollport(
        page,
        page.getByRole('button', { name: '保存' }),
        '记运动 保存',
        { standalone: true },
      )
    })
  })
}

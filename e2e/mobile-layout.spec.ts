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
      await expect(nav.getByRole('link')).toHaveCount(4)

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

      // Templates (via log templates mode; no tab bar item)
      await nav.getByRole('link', { name: '今日' }).click()
      await page.getByRole('link', { name: '+ 记运动' }).click()
      await page
        .getByRole('navigation', { name: '记录方式切换' })
        .getByRole('button', { name: '模板记录' })
        .click()
      await expect(page.getByRole('heading', { name: '小满记运动' })).toBeVisible()
      await page
        .getByRole('region', { name: '常用模板' })
        .getByRole('link', { name: '管理模板' })
        .click()
      await expect(page.getByRole('heading', { name: '小满模板库' })).toBeVisible()
      await assertLayoutShell(page, `${viewport.name} /templates`)
      await assertLocatorInScrollport(
        page,
        page.getByRole('heading', { name: '小满模板库' }),
        '小满模板库标题',
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
      await expect(page.getByRole('heading', { name: '小满记运动' })).toBeVisible()
      await expect(page.locator('.log-ai-section')).toBeVisible()
      await page
        .getByRole('navigation', { name: '记录方式切换' })
        .getByRole('button', { name: '手动录入' })
        .click()
      await assertStandaloneNoHorizontalOverflow(
        page,
        `${viewport.name} /log/exercise`,
      )
      await assertLocatorInScrollport(
        page,
        page
          .getByRole('region', { name: '手动填写' })
          .getByRole('button', { name: '保存' }),
        '记运动 保存',
        { standalone: true },
      )
    })
  })
}

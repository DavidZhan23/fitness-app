import { test } from '@playwright/test'
import { RESPONSIVE_VIEWPORTS } from '../src/lib/responsive'
import { mainNav, registerAndOnboard, uniqueE2eEmail } from './helpers/auth'
import { logExercise } from './helpers/flows'
import {
  assertLayoutShell,
  assertLocatorInScrollport,
  assertNoDescendantWiderThanViewport,
} from './helpers/layout'

for (const viewport of RESPONSIVE_VIEWPORTS) {
  test.describe.serial(`today responsive @ ${viewport.name}`, () => {
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
    })

    test('today hero fits viewport', async ({ page }) => {
      await registerAndOnboard(page, uniqueE2eEmail())
      await logExercise(page, 'E2E responsive 运动', '150')

      await assertLayoutShell(page, `${viewport.name} /`)
      await assertNoDescendantWiderThanViewport(
        page,
        '.app-main__inner',
        `${viewport.name} /`,
      )

      await assertLocatorInScrollport(
        page,
        page.locator('.hero-greeting'),
        '欢迎语',
      )
      await assertLocatorInScrollport(
        page,
        page.locator('.theme-deficit-card'),
        '缺口主卡',
      )
      await assertLocatorInScrollport(
        page,
        page.getByRole('link', { name: '+ 记运动' }),
        '记运动按钮',
      )
      await assertLocatorInScrollport(
        page,
        page.getByRole('link', { name: '+ 记饮食' }),
        '记饮食按钮',
      )
      await assertLocatorInScrollport(
        page,
        page.locator('.today-records-section'),
        '今日记录摘要',
      )

      await mainNav(page).getByRole('link', { name: '今日' }).click()
      await assertLocatorInScrollport(
        page,
        page.locator('.theme-deficit-stats'),
        '三项统计',
      )
    })
  })
}

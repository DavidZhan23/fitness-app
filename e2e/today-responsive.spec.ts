import { test, expect } from '@playwright/test'
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
      const profileAvatarLink = page.getByRole('link', {
        name: '进入我的身体资料设置',
      })
      await assertLocatorInScrollport(
        page,
        profileAvatarLink,
        '头像资料入口',
      )
      await assertLocatorInScrollport(
        page,
        page.locator('.theme-deficit-card'),
        '缺口主卡',
      )
      await expect(page.getByText('热量缺口', { exact: true })).toBeVisible()
      await expect(page.locator('.theme-deficit-value')).toHaveText(/^\d+$/)
      await expect(page.getByText('kcal', { exact: true }).first()).toBeVisible()
      await expect(
        page.getByText(/约等价于减轻 \d+\.\d{1} g 体重/),
      ).toBeVisible()
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

      const explainBtn = page.getByRole('button', {
        name: '了解热量缺口怎么算',
      })
      await expect(explainBtn).toBeVisible()
      await explainBtn.click()
      await expect(
        page.getByText('热量缺口 = 消耗 - 摄入'),
      ).toBeVisible()
      await page.getByRole('button', { name: '知道了' }).click()

      const metabolismBtn = page.getByRole('button', {
        name: '了解基础代谢怎么算',
      })
      await expect(metabolismBtn).toBeVisible()
      await metabolismBtn.click()
      await expect(page.getByText('全天额度已计入')).toBeVisible()
      await page.getByRole('button', { name: '知道了' }).click()

      await assertNoDescendantWiderThanViewport(
        page,
        '.theme-deficit-card',
        `${viewport.name} / 缺口卡`,
      )

      await mainNav(page).getByRole('link', { name: '今日' }).click()
      await assertLocatorInScrollport(
        page,
        page.locator('.theme-deficit-stats'),
        '三项统计',
      )

      await profileAvatarLink.click()
      await expect(page).toHaveURL(/\/settings#body-profile$/)
      await expect(page.getByRole('heading', { name: '设置' })).toBeVisible()
    })
  })
}

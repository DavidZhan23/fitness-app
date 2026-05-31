import { test, expect, type Page } from '@playwright/test'
import { RESPONSIVE_VIEWPORTS } from '../src/lib/responsive'
import { mainNav, registerAndOnboard, uniqueE2eEmail } from './helpers/auth'
import { logExercise } from './helpers/flows'
import {
  assertLayoutShell,
  assertLocatorInScrollport,
  assertNoDescendantWiderThanViewport,
} from './helpers/layout'

function feedbackWall(page: Page, wallTitle: '运动墙' | '美食墙') {
  return page
    .locator('.today-feedback-wall')
    .filter({ has: page.getByRole('heading', { name: wallTitle, level: 3 }) })
}

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
        name: '了解基础消耗怎么算',
      })
      await expect(metabolismBtn).toBeVisible()
      await metabolismBtn.click()
      await expect(page.getByText('随时间自然增长')).toBeVisible()
      await page.getByRole('button', { name: '知道了' }).click()

      await expect(page.getByText('运动墙')).toBeVisible()
      await expect(page.getByText('美食墙')).toBeVisible()

      const exerciseWall = feedbackWall(page, '运动墙')
      await expect(exerciseWall.locator('.today-feedback-wall__status')).toHaveText(
        '今日已点亮',
      )
      await expect(exerciseWall.locator('.today-feedback-wall__count')).toHaveText(
        /运动 \d+ 条/,
      )

      const mealWall = feedbackWall(page, '美食墙')
      await expect(mealWall.locator('.today-feedback-wall__status')).toHaveText(
        '未点亮',
      )

      await assertNoDescendantWiderThanViewport(
        page,
        '.today-feedback-card',
        `${viewport.name} / 今日反馈`,
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

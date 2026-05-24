import { test, expect } from '@playwright/test'
import {
  mainNav,
  registerAndOnboard,
  uniqueE2eEmail,
} from './helpers/auth'

test.describe.serial('main flow smoke', () => {
  test('register, log exercise, and navigate tabs', async ({ page }) => {
    const email = uniqueE2eEmail()
    const exerciseName = 'E2E 慢跑 30 分钟'

    await registerAndOnboard(page, email)

    await page.getByRole('link', { name: '+ 记运动' }).click()
    await page.getByRole('heading', { name: '记运动' }).waitFor()
    await page.getByLabel('名称').fill(exerciseName)
    await page.getByLabel('热量 (kcal)').fill('300')
    await page.getByRole('button', { name: '保存' }).click()

    await expect(page.getByText(exerciseName)).toBeVisible()

    const nav = mainNav(page)
    await nav.getByRole('link', { name: '打卡' }).click()
    await expect(page.getByRole('heading', { name: '打卡墙' })).toBeVisible()

    await nav.getByRole('link', { name: '社区' }).click()
    await expect(
      page.getByRole('heading', { name: '社区', exact: true }),
    ).toBeVisible()

    await nav.getByRole('link', { name: '模板' }).click()
    await expect(page.getByRole('heading', { name: '我的模板' })).toBeVisible()

    await nav.getByRole('link', { name: '今日' }).click()
    await expect(page.getByRole('link', { name: '+ 记运动' })).toBeVisible()
    await expect(page.getByText(exerciseName)).toBeVisible()
  })
})

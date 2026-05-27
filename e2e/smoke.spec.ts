import { test, expect } from '@playwright/test'
import {
  mainNav,
  registerAndOnboard,
  uniqueE2eEmail,
} from './helpers/auth'
import {
  logExercise,
  logMeal,
  openCommunity,
  switchCommunityFilter,
} from './helpers/flows'

test.describe.serial('main flow smoke', () => {
  test('register, log exercise and meal, navigate tabs', async ({ page }) => {
    const email = uniqueE2eEmail()
    const exerciseName = 'E2E 慢跑 30 分钟'
    const mealName = 'E2E 鸡胸肉 150g'

    await registerAndOnboard(page, email)

    await logExercise(page, exerciseName, '300')
    await logMeal(page, mealName, '250')

    const nav = mainNav(page)
    await nav.getByRole('link', { name: '打卡' }).click()
    await expect(page.getByRole('heading', { name: '打卡墙' })).toBeVisible()

    await openCommunity(page)

    await nav.getByRole('link', { name: '模板' }).click()
    await expect(page.getByRole('heading', { name: '我的模板' })).toBeVisible()

    await nav.getByRole('link', { name: '今日' }).click()
    await expect(page.getByRole('link', { name: '+ 记运动' })).toBeVisible()
    await expect(page.getByText(exerciseName)).toBeVisible()
    await expect(page.getByText(mealName)).toBeVisible()
  })

  test('community filter switches without full-page loading', async ({
    page,
  }) => {
    await registerAndOnboard(page, uniqueE2eEmail())
    await logExercise(page, 'E2E 社区可见运动', '200')

    await openCommunity(page)
    await switchCommunityFilter(page, '关注')
    await switchCommunityFilter(page, '全部')

    await expect(
      page.getByRole('heading', { name: '社区', exact: true }),
    ).toBeVisible()
    await expect(page.getByText('加载社区…')).toBeHidden()
    await expect(page.getByLabel('更新中')).toBeHidden()
  })

  test('calendar wall split style toggle', async ({ page }) => {
    await registerAndOnboard(page, uniqueE2eEmail())
    await logExercise(page, 'E2E 墙样式运动', '200')

    const nav = mainNav(page)
    await nav.getByRole('link', { name: '打卡' }).click()
    await expect(page.getByRole('heading', { name: '打卡墙' })).toBeVisible()
    await expect(page.getByText('运动量少')).toBeVisible()
    await expect(page.getByText('盈余少')).toBeVisible()
    await expect(page.getByText('运动连续')).toBeVisible()
    await expect(page.getByText('缺口连续')).toBeVisible()

    await nav.getByRole('link', { name: '设置' }).click()
    await page.getByRole('radio', { name: /分屏版/ }).click()
    await expect(page.getByText('已保存')).toBeVisible({ timeout: 8000 })

    await nav.getByRole('link', { name: '打卡' }).click()
    await expect(page.getByRole('tab', { name: '运动墙' })).toBeVisible()
    await expect(page.getByText('运动量少')).toBeVisible()
    await expect(page.getByText('盈余少')).toBeHidden()

    await page.getByRole('tab', { name: '代谢墙' }).click()
    await expect(page.getByText('运动量少')).toBeHidden()
    await expect(page.getByText('盈余少')).toBeVisible()
  })
})

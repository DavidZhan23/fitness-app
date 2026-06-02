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
  openLogTemplatesTab,
  switchCommunityFilter,
  communityPageMarker,
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

    await nav.getByRole('link', { name: '今日' }).click()
    await openLogTemplatesTab(page, 'exercise')
    await expect(page.getByRole('heading', { name: '小满记运动' })).toBeVisible()
    await page
      .getByRole('region', { name: '常用模板' })
      .getByRole('link', { name: '管理模板' })
      .click()
    await expect(page.getByRole('heading', { name: '小满模板库' })).toBeVisible()
    await expect(page.getByRole('tab', { name: '运动', selected: true })).toBeVisible()

    await nav.getByRole('link', { name: '今日' }).click()
    await expect(page.getByRole('link', { name: '+ 记运动' })).toBeVisible()
    await expect(page.getByText('今日记录')).toBeVisible()
    await expect(page.getByText(/运动 1 条 · 饮食 1 条/)).toBeVisible()
    await page.getByRole('button', { name: /展开/ }).click()
    await expect(page.getByText(mealName)).toBeVisible()
    await expect(page.getByText(exerciseName)).toBeVisible()
  })

  test('today page scrolls within app-main', async ({ page }) => {
    await registerAndOnboard(page, uniqueE2eEmail())
    for (let i = 0; i < 4; i++) {
      await logExercise(page, `E2E 滚动 ${i}`, String(120 + i * 10))
    }
    const main = page.locator('.app-main')
    const { scrollHeight, clientHeight } = await main.evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }))
    expect(scrollHeight).toBeGreaterThan(clientHeight)
    await main.evaluate((el) => {
      el.scrollTop = el.scrollHeight
    })
    expect(await main.evaluate((el) => el.scrollTop)).toBeGreaterThan(10)
  })

  test('community filter switches without full-page loading', async ({
    page,
  }) => {
    await registerAndOnboard(page, uniqueE2eEmail())
    await logExercise(page, 'E2E 社区可见运动', '200')

    await openCommunity(page)
    await switchCommunityFilter(page, '关注')
    await switchCommunityFilter(page, '全部')

    await expect(communityPageMarker(page)).toBeVisible()
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
    const splitRadio = page.getByRole('radio', { name: /分屏版/ })
    const wallStyleSaved = page.waitForResponse(
      (resp) =>
        resp.ok() &&
        resp.request().method() === 'PATCH' &&
        resp.url().includes('/profile'),
    )
    await splitRadio.click()
    await expect(splitRadio).toBeChecked()
    await wallStyleSaved

    await nav.getByRole('link', { name: '打卡' }).click()
    await expect(page.getByRole('tab', { name: '运动墙' })).toBeVisible()
    await expect(page.getByText('运动量少')).toBeVisible()
    await expect(page.getByText('盈余少')).toBeHidden()

    await page.getByRole('tab', { name: '热量墙' }).click()
    await expect(page.getByText('运动量少')).toBeHidden()
    await expect(page.getByText('盈余少')).toBeVisible()

    await page.getByRole('button', { name: /日，今日$/ }).first().click()
    await expect(page.locator('.heatmap-day--selected').first()).toBeVisible()
    await expect(page.getByTestId('calendar-day-detail-panel')).toBeVisible()
  })

  test('settings avatar control is available', async ({ page }) => {
    await registerAndOnboard(page, uniqueE2eEmail())
    const nav = mainNav(page)
    await nav.getByRole('link', { name: '设置' }).click()
    await page.getByRole('button', { name: '查看头像' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('button', { name: '更换头像' })).toBeVisible()
  })
})

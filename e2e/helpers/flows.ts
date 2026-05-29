import { expect, type Page } from '@playwright/test'
import { mainNav } from './auth'

/** Community header after inbox entry polish (title is span, not heading) */
export function communityPageMarker(page: Page) {
  return page.getByRole('tablist', { name: '社区列表筛选' })
}

export function communityPageTitle(page: Page) {
  return page.getByRole('button', { name: '查看互动消息' })
}

export async function logExercise(
  page: Page,
  name: string,
  kcal: string,
) {
  await page.getByRole('link', { name: '+ 记运动' }).click()
  await page.getByRole('heading', { name: '记运动' }).waitFor()
  await page.getByLabel('名称').fill(name)
  await page.getByLabel('热量 (kcal)').fill(kcal)
  await page.getByRole('button', { name: '保存' }).click()
  await expect(page.getByText(name)).toBeVisible()
}

export async function logMeal(page: Page, name: string, kcal: string) {
  await page.getByRole('link', { name: '+ 记饮食' }).click()
  await page.getByRole('heading', { name: '记饮食' }).waitFor()
  await page.getByLabel('名称').fill(name)
  await page.getByLabel('热量 (kcal)').fill(kcal)
  await page.getByRole('button', { name: '保存' }).click()
  await expect(page.getByText(name)).toBeVisible()
}

export async function openCommunity(page: Page) {
  await mainNav(page).getByRole('link', { name: '社区' }).click()
  await expect(communityPageMarker(page)).toBeVisible()
}

/** 切换「全部 / 关注」筛选，并等待列表稳定（不出现整页 loading） */
export async function switchCommunityFilter(
  page: Page,
  filter: '全部' | '关注',
) {
  const tab =
    filter === '全部'
      ? page.getByRole('tab', { name: '全部', exact: true })
      : page.getByRole('tab', { name: /^关注/ })
  await tab.click()
  await expect(tab).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByText('加载社区…')).toBeHidden({ timeout: 15_000 })
}

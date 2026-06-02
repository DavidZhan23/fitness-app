import { expect, type Page } from '@playwright/test'
import { mainNav } from './auth'

/** Community list ready marker */
export function communityPageMarker(page: Page) {
  return page.getByRole('tablist', { name: '社区列表筛选' })
}

/** Inbox hub link (Link with aria-label, not button) — layout anchor for community route */
export function communityPageTitle(page: Page) {
  return page.getByRole('link', { name: '查看互动消息' })
}

function manualLogSection(page: Page) {
  return page.getByRole('region', { name: '手动填写' })
}

export async function openLogPage(
  page: Page,
  kind: 'meal' | 'exercise' = 'meal',
) {
  const linkName = kind === 'meal' ? '+ 记饮食' : '+ 记运动'
  const heading = kind === 'meal' ? '小满记饮食' : '小满记运动'
  await page.getByRole('link', { name: linkName }).click()
  await page.getByRole('heading', { name: heading }).waitFor()
}

/** @deprecated use openLogPage — AI is now the default log entry */
export async function openLogAiTab(
  page: Page,
  kind: 'meal' | 'exercise' = 'meal',
) {
  await openLogPage(page, kind)
  await expect(page.locator('.log-ai-section')).toBeVisible()
}

export async function openLogTemplatesTab(
  page: Page,
  kind: 'meal' | 'exercise' = 'meal',
) {
  await openLogPage(page, kind)
  await page
    .getByRole('navigation', { name: '记录方式切换' })
    .getByRole('button', { name: '模板记录' })
    .click()
  await expect(page.getByRole('region', { name: '常用模板' })).toBeVisible()
}

/** @deprecated use openLogTemplatesTab — deep link still supported */
export async function openLogTemplatesMode(
  page: Page,
  kind: 'meal' | 'exercise' = 'meal',
) {
  await page.goto(`/log/${kind}?mode=templates`)
  const heading = kind === 'meal' ? '小满记饮食' : '小满记运动'
  await page.getByRole('heading', { name: heading }).waitFor()
  await expect(page.getByRole('region', { name: '常用模板' })).toBeVisible()
}

function manualTabName(kind: 'meal' | 'exercise') {
  return kind === 'meal' ? '营养表录入' : '手动录入'
}

function sharedLogNameLabel(kind: 'meal' | 'exercise') {
  return kind === 'meal' ? '饮食名称/描述' : '运动名称/描述'
}

/** 切换到手动/营养表分栏（三栏记录页顶部的 tab） */
export async function expandManualLogSection(
  page: Page,
  kind: 'meal' | 'exercise' = 'exercise',
) {
  await page
    .getByRole('navigation', { name: '记录方式切换' })
    .getByRole('button', { name: manualTabName(kind) })
    .click()
  return manualLogSection(page)
}

export async function logExercise(
  page: Page,
  name: string,
  kcal: string,
) {
  await openLogPage(page, 'exercise')
  const manual = await expandManualLogSection(page, 'exercise')
  await page.getByLabel(sharedLogNameLabel('exercise')).fill(name)
  await manual.getByLabel('热量 (kcal)').fill(kcal)
  await manual.getByRole('button', { name: '保存' }).click()
  await expectTodayRecordInExpandedList(page, name, kcal)
}

export async function logMeal(page: Page, name: string, kcal: string) {
  await openLogPage(page, 'meal')
  const manual = await expandManualLogSection(page, 'meal')
  await page.getByLabel(sharedLogNameLabel('meal')).fill(name)
  await manual.getByLabel('热量 (kcal)').fill(kcal)
  await manual.getByRole('button', { name: '保存' }).click()
  await expectTodayRecordInExpandedList(page, name, kcal)
}

async function expectTodayRecordInExpandedList(
  page: Page,
  name: string,
  kcal: string,
) {
  const records = page.locator('.today-records-section')
  await expect(records.getByRole('button', { name: /展开/ })).toBeVisible()
  await records.getByRole('button', { name: /展开/ }).click()
  const row = records.locator('.today-records-section__row').filter({
    hasText: name,
  })
  await expect(row).toBeVisible()
  await expect(row.locator('.today-records-section__row-meta')).toHaveText(
    `${kcal} kcal`,
  )
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

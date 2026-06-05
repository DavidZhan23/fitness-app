import { test, expect } from '@playwright/test'
import { registerAndOnboard, uniqueE2eEmail } from './helpers/auth'
import { expandManualLogSection, openLogAiTab } from './helpers/flows'

test('manual log can save parsed item as template', async ({ page }) => {
  await registerAndOnboard(page, uniqueE2eEmail())
  await openLogAiTab(page, 'meal')

  const manual = await expandManualLogSection(page, 'meal')
  await manual.getByLabel('吃了什么？').fill('E2E 瘦鸡胸 150g')
  await manual.getByLabel('热量 (kcal)').fill('248')
  await manual.getByRole('checkbox', { name: '保存为快捷模板' }).check()

  await expect(manual.getByLabel('模板名称')).toBeHidden()
  await manual.getByRole('button', { name: '详情/调整' }).click()

  await expect(manual.getByLabel('模板名称')).toHaveValue('E2E 瘦鸡胸')
  await expect(manual.getByLabel('模板单位')).toHaveValue('g')
  await expect(manual.getByLabel('默认数量')).toHaveValue('150')

  await manual.getByRole('button', { name: '保存本次记录' }).click()
  await expect(page).toHaveURL('/')

  await page.goto('/templates?tab=meal')
  const chickenChip = page
    .locator('.template-manage-chip')
    .filter({ hasText: 'E2E 瘦鸡胸' })
  await expect(chickenChip).toBeVisible()
  await expect(chickenChip.getByText('150g ≈ 248 kcal')).toBeVisible()
})

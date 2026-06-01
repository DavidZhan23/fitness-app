import { test, expect } from '@playwright/test'
import { registerAndOnboard, uniqueE2eEmail } from './helpers/auth'
import { openLogTemplatesMode } from './helpers/flows'

test('template drafts confirm and save meal records', async ({ page }) => {
  await registerAndOnboard(page, uniqueE2eEmail())

  await openLogTemplatesMode(page, 'meal')

  const templates = page.getByRole('region', { name: '常用模板' })
  await expect(templates.getByRole('button').first()).toBeVisible()
  const expandMore = templates.getByRole('button', { name: '展开更多' })
  if (await expandMore.isVisible()) {
    await expandMore.click()
  }

  await templates.getByRole('button', { name: '鸡胸肉' }).click()
  await templates.getByRole('button', { name: '鸡蛋' }).click()

  const pending = page.getByRole('region', { name: '确认数量后保存' })
  await expect(pending).toBeVisible()

  const chickenRow = pending.locator('.log-pending-draft-row').filter({
    hasText: '鸡胸肉',
  })
  await chickenRow.getByRole('spinbutton').fill('150')
  await expect(chickenRow.getByText('约 248 kcal')).toBeVisible()

  await pending.getByRole('button', { name: '确认并保存 2 条' }).click()

  await expect(page).toHaveURL('/')
  const records = page.locator('.today-records-section')
  await expect(records.getByText('饮食 1 条 ·')).toBeVisible()
  await records.getByRole('button', { name: /展开/ }).click()
  await expect(page.getByText('本次饮食 · 2 项')).toBeVisible()
  await expect(page.getByText('鸡胸肉 150g')).toBeVisible()
  await expect(page.getByText('鸡蛋 1个')).toBeVisible()
})

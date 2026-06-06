import { test, expect } from '@playwright/test'
import { registerAndOnboard, uniqueE2eEmail } from './helpers/auth'
import { openLogAiTab } from './helpers/flows'

test('AI estimate can save selected item as template', async ({ page }) => {
  await page.route('**/ai/estimate-kcal', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        kcal: 728,
        items: [
          {
            name: '牛肉面',
            quantity: 1,
            unit: '碗',
            kcal: 650,
            confidence: 'medium',
            reason: '按一碗牛肉面估算',
          },
          {
            name: '鸡蛋',
            quantity: 1,
            unit: '个',
            kcal: 78,
            confidence: 'high',
            reason: '按一个估算',
          },
        ],
      }),
    })
  })

  await registerAndOnboard(page, uniqueE2eEmail())
  await openLogAiTab(page, 'meal')

  const aiSection = page.getByRole('region', { name: 'AI 估算' })
  await aiSection
    .getByPlaceholder('例如：一碗牛肉面 + 一个鸡蛋')
    .fill('一碗牛肉面 + 一个鸡蛋')
  await aiSection.getByRole('button', { name: 'AI 估算热量' }).click()

  const result = page.getByRole('region', { name: 'AI 估算结果' })
  await expect(result).toBeVisible()

  await result.getByRole('button', { name: '调整' }).nth(1).click()
  await result.getByRole('checkbox', { name: '保存为快捷模板' }).check()
  await result.getByRole('button', { name: '保存 2 条记录' }).click()

  await expect(page).toHaveURL('/')

  await page.goto('/templates?tab=meal')
  const eggChip = page.locator('.template-manage-chip').filter({ hasText: '鸡蛋' })
  await expect(eggChip).toBeVisible()
  await expect(eggChip.getByText('1个 ≈ 78 kcal')).toBeVisible()
})

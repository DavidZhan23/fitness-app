import { test, expect } from '@playwright/test'
import { registerAndOnboard, uniqueE2eEmail } from './helpers/auth'
import { openLogAiTab } from './helpers/flows'

test('AI estimate shows multiple editable items with confidence and reason', async ({
  page,
}) => {
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
            confidence: 'low',
            reason: '描述较模糊，按普通份量估算',
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
    .fill('一碗牛肉面，一盘鸡蛋')
  await aiSection.getByRole('button', { name: 'AI 估算热量' }).click()

  const result = page.getByRole('region', { name: 'AI 估算结果' })
  await expect(result).toBeVisible()
  await expect(result.locator('.log-ai-item-card')).toHaveCount(2)
  await expect(result.getByText('估算可参考')).toBeVisible()
  await expect(result.locator('.log-ai-confidence--low')).toHaveText('份量不明确')
  await expect(result.getByText('AI 估算依据：按一碗牛肉面估算')).toBeHidden()
  await result.getByRole('button', { name: '调整' }).nth(0).click()
  await result.getByRole('button', { name: '调整' }).nth(0).click()
  await expect(result.getByText('AI 估算依据：按一碗牛肉面估算')).toBeVisible()
  await expect(
    result.getByText('AI 估算依据：描述较模糊，按普通份量估算'),
  ).toBeVisible()
  await expect(result.getByRole('textbox', { name: '名称' }).first()).toHaveValue(
    '牛肉面',
  )
  await expect(result.getByRole('textbox', { name: '名称' }).nth(1)).toHaveValue(
    '鸡蛋',
  )

  await result.getByRole('checkbox', { name: '保存为快捷模板' }).nth(1).check()
  await expect(
    result.getByText('份量较模糊，保存为模板前建议确认单位和数量。'),
  ).toBeVisible()

  await result.getByRole('button', { name: '删除 鸡蛋' }).click()
  const deleteDialog = page.getByRole('dialog')
  await expect(deleteDialog).toBeVisible()
  await expect(deleteDialog.getByRole('heading')).toHaveText('删除这条估算结果？')
  await deleteDialog.getByRole('button', { name: '确定删除' }).click()
  await expect(result.locator('.log-ai-item-card')).toHaveCount(1)
  await expect(result.getByText('1 条')).toBeVisible()

  await result.getByRole('button', { name: '保存 1 条记录' }).click()
  await expect(page).toHaveURL('/')
})

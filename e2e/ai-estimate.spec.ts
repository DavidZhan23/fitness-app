import { test, expect } from '@playwright/test'
import { registerAndOnboard, uniqueE2eEmail } from './helpers/auth'
import { expandManualLogSection, openLogAiTab } from './helpers/flows'

test('AI estimate timeout shows fallback and manual save still works', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-05-24T12:00:00') })

  await page.route('**/ai/estimate-kcal', async () => {
    await new Promise<void>(() => {})
  })

  const mealName = 'E2E AI 超时测试餐'
  await registerAndOnboard(page, uniqueE2eEmail())

  await openLogAiTab(page, 'meal')
  const aiSection = page.getByRole('region', { name: 'AI 估算' })
  await aiSection.getByPlaceholder('例如：一碗牛肉面 + 一个鸡蛋').fill(mealName)
  await aiSection.getByRole('button', { name: 'AI 估算热量' }).click()

  await expect(page.getByText('估算中…')).toBeVisible()
  await page.clock.fastForward(36_000)
  await expect(page.getByText('估算超时，请稍后重试')).toBeVisible()

  const manualSection = await expandManualLogSection(page, 'meal')
  await manualSection.getByLabel('吃了什么？').fill(mealName)
  await manualSection.getByLabel('热量 (kcal)').fill('450')
  await manualSection.getByRole('button', { name: '保存本次记录' }).click()
  await page.getByRole('button', { name: /展开/ }).click()
  await expect(page.getByText(mealName)).toBeVisible()
})

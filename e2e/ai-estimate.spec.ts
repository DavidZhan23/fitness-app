import { test, expect } from '@playwright/test'
import { registerAndOnboard, uniqueE2eEmail } from './helpers/auth'

test('AI estimate timeout shows fallback and manual save still works', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-05-24T12:00:00') })

  await page.route('**/ai/estimate-kcal', async () => {
    await new Promise<void>(() => {})
  })

  const mealName = 'E2E AI 超时测试餐'
  await registerAndOnboard(page, uniqueE2eEmail())

  await page.getByRole('link', { name: '+ 记饮食' }).click()
  await page.getByRole('heading', { name: '记饮食' }).waitFor()
  await page.getByLabel('名称').fill(mealName)
  await page.getByRole('button', { name: 'AI 估算 kcal' }).click()

  await expect(page.getByText('估算中…')).toBeVisible()
  await page.clock.fastForward(36_000)
  await expect(page.getByText('估算超时，请稍后重试')).toBeVisible()

  await page.getByLabel('热量 (kcal)').fill('450')
  await page.getByRole('button', { name: '保存' }).click()
  await expect(page.getByText(mealName)).toBeVisible()
})

import { expect, test } from '@playwright/test'
import { registerAndOnboard, uniqueE2eEmail } from './helpers/auth'

test('wall range failure leaves loading state and offers retry', async ({ page }) => {
  await registerAndOnboard(page, uniqueE2eEmail())
  await expect(page.getByText('加载打卡墙…')).toBeHidden()

  await page.route('**/day-logs/range**', (route) => route.abort('failed'))
  await page.getByRole('button', { name: '‹ 上月' }).click()

  const wallError = page.getByRole('alert')
  await expect(wallError).toContainText('无法连接服务器，请检查网络后重试')
  await expect(wallError.getByRole('button', { name: '重试' })).toBeEnabled()
  await expect(page.getByText('加载打卡墙…')).toBeHidden()
})

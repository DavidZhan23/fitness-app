import type { Page } from '@playwright/test'

export const E2E_PASSWORD = 'e2e-pass-123456'
export const E2E_REGISTRATION_KEY =
  process.env.REGISTRATION_KEY ?? 'e2e-test-key'

export function uniqueE2eEmail() {
  return `e2e+${crypto.randomUUID()}@example.com`
}

export async function registerAndOnboard(page: Page, email: string) {
  await page.goto('/login')
  await page.getByRole('button', { name: '没有账号？注册', exact: true }).click()
  await page.getByLabel('邮箱').fill(email)
  await page.getByLabel('密码', { exact: true }).fill(E2E_PASSWORD)
  await page.getByLabel('注册密钥').fill(E2E_REGISTRATION_KEY)
  await page.getByRole('button', { name: '注册', exact: true }).click()

  await page.getByRole('heading', { name: '完善身体资料' }).waitFor()
  await page.getByLabel('体重 (kg)').fill('70')
  await page.getByLabel('身高 (cm)').fill('175')
  await page.getByLabel('生日').fill('1996-06-15')
  await page.getByRole('button', { name: '开始使用' }).click()

  await page.getByRole('navigation', { name: '主导航' }).waitFor()
}

export function mainNav(page: Page) {
  return page.getByRole('navigation', { name: '主导航' })
}

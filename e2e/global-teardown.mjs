import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export default async function globalTeardown() {
  if (process.env.PW_SKIP_E2E_CLEANUP === '1') return

  execFileSync('node', ['scripts/cleanup-e2e-users.mjs'], {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL:
        process.env.DATABASE_URL ?? 'postgres://localhost:5432/fitness',
      E2E_USER_RETAIN_MAX: process.env.E2E_USER_RETAIN_MAX ?? '5',
    },
  })
}

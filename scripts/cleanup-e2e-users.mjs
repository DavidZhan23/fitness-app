#!/usr/bin/env node
/**
 * Remove excess Playwright E2E users from the local DB.
 * Keeps the newest E2E_USER_RETAIN_MAX accounts (default 5) matching e2e+*@example.com.
 *
 * Usage:
 *   node scripts/cleanup-e2e-users.mjs
 *   E2E_USER_RETAIN_MAX=5 DATABASE_URL=postgres://localhost:5432/fitness node scripts/cleanup-e2e-users.mjs
 */

import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const { Pool } = require(path.resolve(__dirname, '../server/node_modules/pg'))

const E2E_EMAIL_PATTERN = 'e2e+%@example.com'
const retainMax = Math.max(
  0,
  Number.parseInt(process.env.E2E_USER_RETAIN_MAX ?? '5', 10) || 5,
)

const databaseUrl =
  process.env.DATABASE_URL ?? 'postgres://localhost:5432/fitness'

const pool = new Pool({ connectionString: databaseUrl })

try {
  const { rows: counted } = await pool.query(
    `select count(*)::int as c from users where email like $1`,
    [E2E_EMAIL_PATTERN],
  )
  const total = counted[0]?.c ?? 0

  if (total <= retainMax) {
    console.log(
      `e2e cleanup: ${total} test user(s); keeping all (max ${retainMax}).`,
    )
    process.exit(0)
  }

  const { rows: deleted } = await pool.query(
    `with ranked as (
       select id,
              row_number() over (order by created_at desc) as rn
       from users
       where email like $1
     )
     delete from users
     where id in (select id from ranked where rn > $2)
     returning email`,
    [E2E_EMAIL_PATTERN, retainMax],
  )

  const remaining = total - deleted.length
  console.log(
    `e2e cleanup: removed ${deleted.length} test user(s); kept ${remaining} (max ${retainMax}).`,
  )
} catch (err) {
  console.error('e2e cleanup failed:', err instanceof Error ? err.message : err)
  process.exit(1)
} finally {
  await pool.end()
}

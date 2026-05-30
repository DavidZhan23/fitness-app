#!/usr/bin/env node
/**
 * Remove QA manual seed actors (qa-seed+*@example.com) from the local DB.
 * Never deletes jerryuk1019@163.com or other non-qa-seed accounts.
 *
 * Usage:
 *   npm run cleanup:qa-seed
 *   DATABASE_URL=postgres://localhost:5432/fitness node scripts/cleanup-qa-seed.mjs
 */

import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertLocalFitnessDatabase } from './lib/assert-local-fitness-db.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const { Pool } = require(path.resolve(__dirname, '../server/node_modules/pg'))

const QA_SEED_EMAIL_PATTERN = 'qa-seed+%@example.com'
const PROTECTED_EMAIL = 'jerryuk1019@163.com'

const databaseUrl =
  process.env.DATABASE_URL ?? 'postgres://localhost:5432/fitness'

try {
  assertLocalFitnessDatabase(databaseUrl)
} catch (err) {
  console.error(
    'qa-seed cleanup refused:',
    err instanceof Error ? err.message : err,
  )
  process.exit(1)
}

if (PROTECTED_EMAIL.includes('qa-seed+')) {
  console.error('qa-seed cleanup: protected email misconfigured')
  process.exit(1)
}

const pool = new Pool({ connectionString: databaseUrl })

try {
  const { rows: protectedHit } = await pool.query(
    `select email from users where email = $1 and email like $2`,
    [PROTECTED_EMAIL, QA_SEED_EMAIL_PATTERN],
  )
  if (protectedHit.length > 0) {
    console.error(
      `qa-seed cleanup: refusing to run — protected email ${PROTECTED_EMAIL} matched qa-seed pattern`,
    )
    process.exit(1)
  }

  const { rows: deleted } = await pool.query(
    `delete from users
     where email like $1
       and email <> $2
     returning email`,
    [QA_SEED_EMAIL_PATTERN, PROTECTED_EMAIL],
  )

  if (deleted.length === 0) {
    console.log('qa-seed cleanup: no qa-seed users to remove.')
  } else {
    console.log(
      `qa-seed cleanup: removed ${deleted.length} user(s): ${deleted.map((r) => r.email).join(', ')}`,
    )
  }
} catch (err) {
  console.error(
    'qa-seed cleanup failed:',
    err instanceof Error ? err.message : err,
  )
  process.exit(1)
} finally {
  await pool.end()
}

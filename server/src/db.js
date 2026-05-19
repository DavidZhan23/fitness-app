import pg from 'pg'

const { Pool } = pg

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
})

pool.on('error', (err) => {
  console.error('[db] idle client error', err)
})

export async function query(text, params) {
  return pool.query(text, params)
}

export async function runMigrations() {
  try {
    await pool.query(
      `alter table public.profiles alter column activity_factor type numeric(6, 3)`,
    )
  } catch {
    /* 列已迁移或表未建 */
  }
  try {
    await pool.query(
      `alter table public.profiles add column if not exists nickname text`,
    )
  } catch {
    /* 表未建等 */
  }
}

export async function waitForDb(maxAttempts = 30, delayMs = 1000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await pool.query('select 1')
      await runMigrations()
      return
    } catch (err) {
      console.warn(
        `[db] not ready (${attempt}/${maxAttempts}):`,
        err.message || err,
      )
      if (attempt === maxAttempts) throw err
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }
}

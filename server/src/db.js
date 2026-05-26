import pg from 'pg'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readdir, readFile } from 'node:fs/promises'

const { Pool } = pg
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MIGRATIONS_DIR = path.resolve(__dirname, '../migrations')

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

async function ensureSchemaMigrationsTable(client) {
  await client.query(`
    create table if not exists public.schema_migrations (
      filename text primary key,
      executed_at timestamptz not null default now()
    )
  `)
}

async function listMigrationFiles() {
  let files = []
  try {
    files = await readdir(MIGRATIONS_DIR)
  } catch (err) {
    if (err?.code === 'ENOENT') {
      console.warn(`[db] migrations dir not found: ${MIGRATIONS_DIR}`)
      return []
    }
    throw err
  }
  return files
    .filter((name) => /^\d+.*\.sql$/i.test(name))
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
}

async function baselineExistingDatabase(client, migrationFiles) {
  const { rows } = await client.query(
    `select count(*)::int as c from public.schema_migrations`,
  )
  if ((rows[0]?.c ?? 0) > 0) return

  const existing = await client.query(
    `select to_regclass('public.users') is not null as users_exists`,
  )
  if (!existing.rows[0]?.users_exists || migrationFiles.length === 0) return

  await client.query(
    `insert into public.schema_migrations (filename)
     select unnest($1::text[])
     on conflict do nothing`,
    [migrationFiles],
  )
  console.log(`[db] baseline existing schema with ${migrationFiles.length} migrations`)
}

async function runSqlFileMigrations() {
  const client = await pool.connect()
  try {
    await ensureSchemaMigrationsTable(client)
    const migrationFiles = await listMigrationFiles()
    await baselineExistingDatabase(client, migrationFiles)

    const appliedRows = await client.query(
      `select filename from public.schema_migrations`,
    )
    const applied = new Set(appliedRows.rows.map((r) => r.filename))

    for (const filename of migrationFiles) {
      if (applied.has(filename)) continue
      const sql = await readFile(path.join(MIGRATIONS_DIR, filename), 'utf8')
      await client.query('begin')
      try {
        await client.query(sql)
        await client.query(
          `insert into public.schema_migrations (filename) values ($1)
           on conflict do nothing`,
          [filename],
        )
        await client.query('commit')
        console.log(`[db] applied migration ${filename}`)
      } catch (err) {
        await client.query('rollback')
        throw err
      }
    }
  } finally {
    client.release()
  }
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
  try {
    await pool.query(
      `alter table public.profiles add column if not exists community_visible boolean not null default false`,
    )
  } catch {
    /* 表未建等 */
  }
  try {
    await pool.query(`
      create table if not exists public.follows (
        follower_id uuid not null references public.users (id) on delete cascade,
        followee_id uuid not null references public.users (id) on delete cascade,
        created_at timestamptz not null default now(),
        primary key (follower_id, followee_id),
        check (follower_id <> followee_id)
      )`)
    await pool.query(`
      create table if not exists public.day_likes (
        id uuid primary key default gen_random_uuid(),
        liker_id uuid not null references public.users (id) on delete cascade,
        target_user_id uuid not null references public.users (id) on delete cascade,
        like_date date not null,
        created_at timestamptz not null default now(),
        unique (liker_id, target_user_id, like_date)
      )`)
    await pool.query(`
      create table if not exists public.day_comments (
        id uuid primary key default gen_random_uuid(),
        author_id uuid not null references public.users (id) on delete cascade,
        target_user_id uuid not null references public.users (id) on delete cascade,
        log_date date not null,
        body text not null,
        created_at timestamptz not null default now()
      )`)
    await pool.query(`
      create table if not exists public.community_member_order (
        viewer_id uuid not null references public.users (id) on delete cascade,
        member_id uuid not null references public.users (id) on delete cascade,
        sort_index integer not null,
        primary key (viewer_id, member_id),
        check (viewer_id <> member_id)
      )`)
    await pool.query(
      `alter table public.profiles add column if not exists community_notify_seen_at timestamptz`,
    )
    await pool.query(`
      alter table public.day_comments
        add column if not exists parent_comment_id uuid references public.day_comments (id) on delete cascade`)
    await pool.query(`
      alter table public.day_comments
        add column if not exists reply_to_user_id uuid references public.users (id) on delete set null`)
    await pool.query(`
      create table if not exists public.log_item_reactions (
        voter_id uuid not null references public.users (id) on delete cascade,
        owner_user_id uuid not null references public.users (id) on delete cascade,
        item_type text not null check (item_type in ('exercise', 'meal')),
        item_id uuid not null,
        reaction smallint not null check (reaction in (1, -1)),
        created_at timestamptz not null default now(),
        primary key (voter_id, item_type, item_id)
      )`)
  } catch {
    /* 表未建等 */
  }
  try {
    await pool.query(`
      create table if not exists public.day_comment_likes (
        comment_id uuid not null references public.day_comments (id) on delete cascade,
        liker_id uuid not null references public.users (id) on delete cascade,
        created_at timestamptz not null default now(),
        primary key (comment_id, liker_id)
      )`)
    await pool.query(`
      create index if not exists idx_day_comment_likes_liker
      on public.day_comment_likes (liker_id, created_at)`)
  } catch {
    /* 表未建等 */
  }
  try {
    await pool.query(`
      create table if not exists public.telemetry_events (
        id uuid primary key default gen_random_uuid(),
        user_id uuid references public.users (id) on delete set null,
        event_name text not null,
        route_path text,
        duration_ms integer,
        metadata jsonb,
        client_at timestamptz,
        created_at timestamptz not null default now()
      )`)
    await pool.query(`
      create index if not exists idx_telemetry_events_name_created
      on public.telemetry_events (event_name, created_at desc)`)
    await pool.query(`
      create index if not exists idx_telemetry_events_user_created
      on public.telemetry_events (user_id, created_at desc)`)
  } catch {
    /* 表未建等 */
  }
  try {
    await pool.query(
      `alter table public.telemetry_events add column if not exists session_id text`,
    )
    await pool.query(
      `alter table public.telemetry_events add column if not exists app_version text`,
    )
    await pool.query(
      `alter table public.telemetry_events add column if not exists commit_sha text`,
    )
    await pool.query(`
      create index if not exists idx_telemetry_events_session
      on public.telemetry_events (session_id, created_at desc)`)
  } catch {
    /* 表未建等 */
  }
  try {
    await pool.query(`
      create table if not exists public.weekly_reports (
        id uuid primary key default gen_random_uuid(),
        week_id text not null unique,
        week_start_date date not null,
        week_end_date date not null,
        status text not null default 'final',
        metrics_json jsonb not null,
        analysis_md text,
        recommendations_md text,
        report_md text not null,
        report_path text,
        generated_by text not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )`)
    await pool.query(`
      create index if not exists idx_weekly_reports_week
      on public.weekly_reports (week_id)`)
  } catch {
    /* 表未建等 */
  }
  await runSqlFileMigrations()
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

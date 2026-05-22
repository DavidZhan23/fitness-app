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

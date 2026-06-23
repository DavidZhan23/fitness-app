create table if not exists public.user_weekly_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  week_start_date date not null,
  week_end_date date not null,
  week_number integer not null check (week_number between 1 and 53),
  year integer not null,
  report_json jsonb not null,
  is_viewed boolean not null default false,
  viewed_at timestamptz,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start_date)
);

create index if not exists idx_user_weekly_reports_user_week
  on public.user_weekly_reports (user_id, week_start_date desc);

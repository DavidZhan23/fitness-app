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
);

create index if not exists idx_weekly_reports_week
  on public.weekly_reports (week_id);

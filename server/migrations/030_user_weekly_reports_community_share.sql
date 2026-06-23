alter table public.user_weekly_reports
  add column if not exists shared_to_community_at timestamptz;

create index if not exists idx_user_weekly_reports_community_shared
  on public.user_weekly_reports (user_id, shared_to_community_at desc)
  where shared_to_community_at is not null;

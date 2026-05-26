alter table public.day_logs
  add column if not exists community_visible boolean not null default true;

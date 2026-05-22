alter table public.profiles
  add column if not exists community_notify_seen_at timestamptz;

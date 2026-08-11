alter table public.profiles
  add column if not exists community_visible_locked_by_developer boolean not null default false;


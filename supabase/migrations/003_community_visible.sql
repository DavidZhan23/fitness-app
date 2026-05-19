alter table public.profiles
  add column if not exists community_visible boolean not null default false;

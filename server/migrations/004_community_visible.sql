-- 社区公开：勾选后其他用户可查看今日动态与打卡墙
alter table public.profiles
  add column if not exists community_visible boolean not null default false;

create index if not exists profiles_community_visible_idx
  on public.profiles (community_visible)
  where community_visible = true;

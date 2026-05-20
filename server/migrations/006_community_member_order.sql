-- 每位用户自定义社区成员列表顺序

create table if not exists public.community_member_order (
  viewer_id uuid not null references public.users (id) on delete cascade,
  member_id uuid not null references public.users (id) on delete cascade,
  sort_index integer not null,
  primary key (viewer_id, member_id),
  check (viewer_id <> member_id)
);

create index if not exists idx_community_member_order_viewer
  on public.community_member_order (viewer_id, sort_index);

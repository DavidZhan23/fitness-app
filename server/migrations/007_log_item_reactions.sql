-- 社区：对单条运动 / 饮食记录点赞、点踩

create table if not exists public.log_item_reactions (
  voter_id uuid not null references public.users (id) on delete cascade,
  owner_user_id uuid not null references public.users (id) on delete cascade,
  item_type text not null check (item_type in ('exercise', 'meal')),
  item_id uuid not null,
  reaction smallint not null check (reaction in (1, -1)),
  created_at timestamptz not null default now(),
  primary key (voter_id, item_type, item_id)
);

create index if not exists idx_log_item_reactions_item
  on public.log_item_reactions (item_type, item_id);

create index if not exists idx_log_item_reactions_owner
  on public.log_item_reactions (owner_user_id);

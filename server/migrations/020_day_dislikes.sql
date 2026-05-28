-- 社区社交：每日点踩（与点赞互斥，由业务层保证）

create table if not exists public.day_dislikes (
  id uuid primary key default gen_random_uuid(),
  liker_id uuid not null references public.users (id) on delete cascade,
  target_user_id uuid not null references public.users (id) on delete cascade,
  like_date date not null,
  created_at timestamptz not null default now(),
  unique (liker_id, target_user_id, like_date)
);

create index if not exists idx_day_dislikes_target_date
  on public.day_dislikes (target_user_id, like_date);

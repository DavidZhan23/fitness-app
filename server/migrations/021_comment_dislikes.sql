-- 社区评论点踩

create table if not exists public.day_comment_dislikes (
  comment_id uuid not null references public.day_comments (id) on delete cascade,
  disliker_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, disliker_id)
);

create index if not exists idx_day_comment_dislikes_disliker
  on public.day_comment_dislikes (disliker_id, created_at);

-- 社区评论点赞

create table if not exists public.day_comment_likes (
  comment_id uuid not null references public.day_comments (id) on delete cascade,
  liker_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, liker_id)
);

create index if not exists idx_day_comment_likes_liker
  on public.day_comment_likes (liker_id, created_at);

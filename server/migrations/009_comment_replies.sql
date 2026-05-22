-- 社区评论回复

alter table public.day_comments
  add column if not exists parent_comment_id uuid references public.day_comments (id) on delete cascade;

alter table public.day_comments
  add column if not exists reply_to_user_id uuid references public.users (id) on delete set null;

create index if not exists idx_day_comments_parent
  on public.day_comments (parent_comment_id, created_at);

create index if not exists idx_day_comments_reply_to
  on public.day_comments (reply_to_user_id, created_at)
  where reply_to_user_id is not null;

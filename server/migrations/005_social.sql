-- 社区社交：关注、每日点赞、每日评论

create table if not exists public.follows (
  follower_id uuid not null references public.users (id) on delete cascade,
  followee_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create index if not exists idx_follows_followee on public.follows (followee_id);

create table if not exists public.day_likes (
  id uuid primary key default gen_random_uuid(),
  liker_id uuid not null references public.users (id) on delete cascade,
  target_user_id uuid not null references public.users (id) on delete cascade,
  like_date date not null,
  created_at timestamptz not null default now(),
  unique (liker_id, target_user_id, like_date)
);

create index if not exists idx_day_likes_target_date
  on public.day_likes (target_user_id, like_date);

create table if not exists public.day_comments (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.users (id) on delete cascade,
  target_user_id uuid not null references public.users (id) on delete cascade,
  log_date date not null,
  body text not null check (char_length(trim(body)) between 1 and 280),
  created_at timestamptz not null default now()
);

create index if not exists idx_day_comments_target_date
  on public.day_comments (target_user_id, log_date, created_at);

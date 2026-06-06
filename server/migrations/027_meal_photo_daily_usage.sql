-- 饮食拍照 AI 每日用量（按用户 + 日历日，Asia/Shanghai 由应用层写入 usage_date）
create table if not exists public.meal_photo_daily_usage (
  user_id uuid not null references public.profiles (id) on delete cascade,
  usage_date date not null,
  use_count integer not null default 0 check (use_count >= 0),
  primary key (user_id, usage_date)
);

create index if not exists idx_meal_photo_daily_usage_date
  on public.meal_photo_daily_usage (usage_date);

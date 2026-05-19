-- 用户昵称（可选，设置页可修改）
alter table public.profiles
  add column if not exists nickname text;

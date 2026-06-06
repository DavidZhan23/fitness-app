-- 基础代谢计入方式：full_day 当天立即计入全天；time_spread 随时间累计
alter table public.profiles
  add column if not exists metabolism_mode text not null default 'full_day';

alter table public.profiles
  drop constraint if exists profiles_metabolism_mode_check;

alter table public.profiles
  add constraint profiles_metabolism_mode_check
  check (metabolism_mode in ('full_day', 'time_spread'));

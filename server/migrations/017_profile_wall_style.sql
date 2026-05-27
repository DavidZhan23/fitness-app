-- 打卡墙展示样式：classic 同页双 grid；split 分屏切换运动墙/代谢墙
alter table public.profiles
  add column if not exists wall_style text not null default 'classic';

alter table public.profiles
  drop constraint if exists profiles_wall_style_check;

alter table public.profiles
  add constraint profiles_wall_style_check
  check (wall_style in ('classic', 'split'));

-- 活动系数需容纳 1.725 等值，numeric(4,3) 在部分环境会写入失败
alter table public.profiles
  alter column activity_factor type numeric(6, 3);

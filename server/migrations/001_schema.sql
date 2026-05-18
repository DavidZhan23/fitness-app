-- 自托管版数据库（不依赖 Supabase auth.users）
-- 在腾讯云 PostgreSQL 或 Docker 内 postgres 中执行

create extension if not exists "pgcrypto";

create table public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  created_at timestamptz default now()
);

create table public.profiles (
  id uuid primary key references public.users (id) on delete cascade,
  email text,
  weight_kg numeric(5, 2),
  height_cm numeric(5, 2),
  age integer,
  sex text check (sex in ('male', 'female')),
  activity_factor numeric(4, 3) default 1.2,
  bmr numeric(8, 2),
  tdee numeric(8, 2),
  deficit_threshold integer default 0,
  onboarding_complete boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.day_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  log_date date not null,
  tdee_snapshot numeric(8, 2) not null default 0,
  exercise_kcal numeric(8, 2) not null default 0,
  meal_kcal numeric(8, 2) not null default 0,
  deficit numeric(8, 2) not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, log_date)
);

create index day_logs_user_date_idx on public.day_logs (user_id, log_date desc);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  day_log_id uuid not null references public.day_logs (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  kcal numeric(8, 2) not null check (kcal >= 0),
  created_at timestamptz default now()
);

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  day_log_id uuid not null references public.day_logs (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  kcal numeric(8, 2) not null check (kcal >= 0),
  created_at timestamptz default now()
);

create table public.exercise_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  kcal numeric(8, 2) not null check (kcal >= 0),
  created_at timestamptz default now()
);

create table public.meal_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  kcal numeric(8, 2) not null check (kcal >= 0),
  created_at timestamptz default now()
);

create or replace function public.recalculate_day_log(p_day_log_id uuid)
returns void language plpgsql as $$
declare
  v_exercise numeric;
  v_meal numeric;
  v_tdee numeric;
  v_deficit numeric;
begin
  select coalesce(sum(kcal), 0) into v_exercise from exercises where day_log_id = p_day_log_id;
  select coalesce(sum(kcal), 0) into v_meal from meals where day_log_id = p_day_log_id;
  select tdee_snapshot into v_tdee from day_logs where id = p_day_log_id;
  v_deficit := coalesce(v_tdee, 0) + v_exercise - v_meal;
  update day_logs
  set exercise_kcal = v_exercise, meal_kcal = v_meal, deficit = v_deficit, updated_at = now()
  where id = p_day_log_id;
end;
$$;

create or replace function public.trigger_recalculate_day_log()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    perform recalculate_day_log(old.day_log_id);
    return old;
  else
    perform recalculate_day_log(new.day_log_id);
    return new;
  end if;
end;
$$;

create trigger exercises_recalc after insert or update or delete on public.exercises
  for each row execute function public.trigger_recalculate_day_log();

create trigger meals_recalc after insert or update or delete on public.meals
  for each row execute function public.trigger_recalculate_day_log();

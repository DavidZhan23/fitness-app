-- Profiles (extends auth.users)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
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

-- Day logs (one per user per date)
create table public.day_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
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

-- Exercises
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  day_log_id uuid not null references public.day_logs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  kcal numeric(8, 2) not null check (kcal >= 0),
  created_at timestamptz default now()
);

create index exercises_day_log_idx on public.exercises (day_log_id);

-- Meals
create table public.meals (
  id uuid primary key default gen_random_uuid(),
  day_log_id uuid not null references public.day_logs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  kcal numeric(8, 2) not null check (kcal >= 0),
  created_at timestamptz default now()
);

create index meals_day_log_idx on public.meals (day_log_id);

-- User templates
create table public.exercise_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  kcal numeric(8, 2) not null check (kcal >= 0),
  created_at timestamptz default now()
);

create table public.meal_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  kcal numeric(8, 2) not null check (kcal >= 0),
  created_at timestamptz default now()
);

-- RLS
alter table public.profiles enable row level security;
alter table public.day_logs enable row level security;
alter table public.exercises enable row level security;
alter table public.meals enable row level security;
alter table public.exercise_templates enable row level security;
alter table public.meal_templates enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

create policy "day_logs_select_own" on public.day_logs for select using (auth.uid() = user_id);
create policy "day_logs_insert_own" on public.day_logs for insert with check (auth.uid() = user_id);
create policy "day_logs_update_own" on public.day_logs for update using (auth.uid() = user_id);
create policy "day_logs_delete_own" on public.day_logs for delete using (auth.uid() = user_id);

create policy "exercises_select_own" on public.exercises for select using (auth.uid() = user_id);
create policy "exercises_insert_own" on public.exercises for insert with check (auth.uid() = user_id);
create policy "exercises_update_own" on public.exercises for update using (auth.uid() = user_id);
create policy "exercises_delete_own" on public.exercises for delete using (auth.uid() = user_id);

create policy "meals_select_own" on public.meals for select using (auth.uid() = user_id);
create policy "meals_insert_own" on public.meals for insert with check (auth.uid() = user_id);
create policy "meals_update_own" on public.meals for update using (auth.uid() = user_id);
create policy "meals_delete_own" on public.meals for delete using (auth.uid() = user_id);

create policy "exercise_templates_all_own" on public.exercise_templates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "meal_templates_all_own" on public.meal_templates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Recalculate day_log totals when exercises/meals change
create or replace function public.recalculate_day_log(p_day_log_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
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
  set exercise_kcal = v_exercise,
      meal_kcal = v_meal,
      deficit = v_deficit,
      updated_at = now()
  where id = p_day_log_id;
end;
$$;

create or replace function public.trigger_recalculate_day_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

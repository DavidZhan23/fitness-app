alter table public.meals
  add column if not exists protein_g numeric,
  add column if not exists fat_g numeric,
  add column if not exists carbs_g numeric,
  add column if not exists sugar_g numeric,
  add column if not exists macros_source text;

alter table public.meals
  drop constraint if exists meals_macros_source_check;

alter table public.meals
  add constraint meals_macros_source_check
  check (macros_source is null or macros_source in ('user', 'ai'));

alter table public.meals
  add column if not exists sugar_scope text;

alter table public.meals
  drop constraint if exists meals_sugar_scope_check;

alter table public.meals
  add constraint meals_sugar_scope_check
  check (sugar_scope is null or sugar_scope = 'added');

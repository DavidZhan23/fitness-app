alter table public.meals
  add column if not exists macros_status text;

alter table public.meals
  drop constraint if exists meals_macros_status_check;

alter table public.meals
  add constraint meals_macros_status_check
  check (
    macros_status is null
    or macros_status in ('pending', 'ready', 'error')
  );

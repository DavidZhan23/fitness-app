alter table public.meals
  add column if not exists batch_id uuid;

create index if not exists idx_meals_day_log_batch
  on public.meals (day_log_id, batch_id);

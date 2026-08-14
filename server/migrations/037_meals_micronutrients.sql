alter table public.meals
  add column if not exists micronutrients jsonb,
  add column if not exists micronutrients_fingerprint text;

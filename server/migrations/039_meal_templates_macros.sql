alter table public.meal_templates
  add column if not exists protein_g numeric,
  add column if not exists fat_g numeric,
  add column if not exists carbs_g numeric,
  add column if not exists sugar_g numeric;

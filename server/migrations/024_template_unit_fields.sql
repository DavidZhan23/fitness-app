alter table public.exercise_templates
  add column if not exists unit text,
  add column if not exists kcal_per_unit numeric(10, 4),
  add column if not exists default_quantity numeric(10, 2);

alter table public.meal_templates
  add column if not exists unit text,
  add column if not exists kcal_per_unit numeric(10, 4),
  add column if not exists default_quantity numeric(10, 2);

update public.exercise_templates
set
  unit = coalesce(nullif(trim(unit), ''), '份'),
  kcal_per_unit = coalesce(kcal_per_unit, kcal),
  default_quantity = coalesce(default_quantity, 1)
where unit is null
   or kcal_per_unit is null
   or default_quantity is null;

update public.meal_templates
set
  unit = coalesce(nullif(trim(unit), ''), '份'),
  kcal_per_unit = coalesce(kcal_per_unit, kcal),
  default_quantity = coalesce(default_quantity, 1)
where unit is null
   or kcal_per_unit is null
   or default_quantity is null;

update public.exercise_templates
set kcal = round(kcal_per_unit * default_quantity)
where kcal_per_unit is not null
  and default_quantity is not null;

update public.meal_templates
set kcal = round(kcal_per_unit * default_quantity)
where kcal_per_unit is not null
  and default_quantity is not null;

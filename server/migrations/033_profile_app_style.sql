alter table public.profiles
  add column if not exists app_style text,
  add column if not exists hero_collab jsonb;


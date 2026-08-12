alter table public.day_logs
  add column if not exists micronutrient_status text,
  add column if not exists micronutrient_fingerprint text,
  add column if not exists micronutrient_summary jsonb,
  add column if not exists micronutrient_updated_at timestamptz,
  add column if not exists micronutrient_error text;

alter table public.day_logs
  drop constraint if exists day_logs_micronutrient_status_check;

alter table public.day_logs
  add constraint day_logs_micronutrient_status_check
  check (
    micronutrient_status is null
    or micronutrient_status in ('idle', 'pending', 'ready', 'error')
  );

update public.day_logs
set micronutrient_status = 'idle'
where micronutrient_status is null;

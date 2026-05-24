alter table public.telemetry_events
  add column if not exists session_id text;

alter table public.telemetry_events
  add column if not exists app_version text;

alter table public.telemetry_events
  add column if not exists commit_sha text;

create index if not exists idx_telemetry_events_session
  on public.telemetry_events (session_id, created_at desc);

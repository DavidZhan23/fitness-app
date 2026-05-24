create table if not exists public.telemetry_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users (id) on delete set null,
  event_name text not null,
  route_path text,
  duration_ms integer,
  metadata jsonb,
  client_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_telemetry_events_name_created
  on public.telemetry_events (event_name, created_at desc);

create index if not exists idx_telemetry_events_user_created
  on public.telemetry_events (user_id, created_at desc);

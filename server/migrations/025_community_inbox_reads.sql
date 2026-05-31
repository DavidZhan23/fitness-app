create table if not exists community_inbox_reads (
  user_id uuid not null references profiles(id) on delete cascade,
  inbox_id text not null,
  read_at timestamptz not null default now(),
  primary key (user_id, inbox_id)
);

create index if not exists idx_community_inbox_reads_user_read_at
  on community_inbox_reads (user_id, read_at desc);

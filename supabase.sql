-- ============================================================
-- De Kroegentocht · Supabase schema
-- v2.4.0-build.2026.08
--
-- Two tables:
--   party           one row per person, heartbeat-updated
--   crawl_sessions  one row per room: group size + venue swaps
--
-- Security model: anon key only, RLS on, writes constrained by
-- CHECK constraints and policy WITH CHECK clauses. Anyone with
-- the anon key can write rows that satisfy the constraints —
-- acceptable for a pub crawl among friends, stated plainly.
-- ============================================================

create table if not exists party (
  id          text primary key
              check (char_length(id) between 4 and 16),
  room        text not null
              check (room ~ '^[a-z0-9-]{1,24}$'),
  name        text
              check (char_length(name) <= 18),
  color       text
              check (color ~ '^#[0-9A-Fa-f]{6}$'),
  stop_idx    int    check (stop_idx between 0 and 8),
  done_count  int    check (done_count between 0 and 9),
  last_in     bigint,
  seen        bigint check (seen > 1700000000000),
  lat         float8 check (lat is null or (lat between  52.0 and 53.0)),
  lon         float8 check (lon is null or (lon between   4.0 and  5.5)),
  rally_stop  int    check (rally_stop is null or (rally_stop between 0 and 8)),
  rally_ts    bigint
);

create index if not exists party_room_seen on party (room, seen);

create table if not exists crawl_sessions (
  room        text primary key
              check (room ~ '^[a-z0-9-]{1,24}$'),
  group_size  text not null default 'small'
              check (group_size in ('small','medium','large')),
  swaps       jsonb not null default '{}'::jsonb
              check (pg_column_size(swaps) < 512),
  updated_at  bigint not null
);

alter table party          enable row level security;
alter table crawl_sessions enable row level security;

-- Anyone in the room can read the board and the session settings.
create policy "party read"    on party          for select to anon using (true);
create policy "sessions read" on crawl_sessions for select to anon using (true);

-- Writes are open to anon but bounded by the CHECK constraints above;
-- the WITH CHECK re-asserts the room format so a policy change never
-- silently widens it.
create policy "party write" on party
  for insert to anon with check (room ~ '^[a-z0-9-]{1,24}$');
create policy "party update" on party
  for update to anon using (true) with check (room ~ '^[a-z0-9-]{1,24}$');

create policy "sessions write" on crawl_sessions
  for insert to anon with check (room ~ '^[a-z0-9-]{1,24}$');
create policy "sessions update" on crawl_sessions
  for update to anon using (true) with check (room ~ '^[a-z0-9-]{1,24}$');

-- Realtime (the app itself polls REST every 12 s so it also works
-- without this, but enabling it costs nothing and allows a future
-- supabase-js subscription without a schema change).
alter publication supabase_realtime add table party;
alter publication supabase_realtime add table crawl_sessions;

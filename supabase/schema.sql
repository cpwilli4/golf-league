-- Golf League App database schema
-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run

create table courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- 18 holes: [{ "number": 1, "par": 4, "handicap": 7 }, ...]
  holes jsonb not null,
  -- tee names: ["Black", "Blue"]
  tees jsonb not null default '[]',
  created_at timestamptz default now()
);

create table players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table events (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses(id) not null,
  title text,
  event_date date not null,
  -- place payouts entered manually: [110, 66, 44]
  payouts jsonb not null default '[]',
  -- LA Cup points per place for this event: [475, 245, 140, ...]
  points jsonb not null default '[]',
  skins_pot numeric not null default 0,
  kp_pot numeric not null default 0,
  -- groups: [{ "number": 1, "teeTime": "10:00am" }, ...]
  groups jsonb not null default '[]',
  created_at timestamptz default now()
);

create table rounds (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade not null,
  player_id uuid references players(id) not null,
  tee text not null,
  course_handicap int not null,
  group_number int,
  -- 18 hole scores: [4, 5, 3, ...]
  scores jsonb not null,
  created_at timestamptz default now(),
  unique (event_id, player_id)
);

create table kp_entries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade not null,
  hole_number int not null,
  group_number int not null,
  player_id uuid references players(id) not null,
  distance_feet int not null default 0,
  distance_inches int not null default 0,
  made_par boolean not null default false,
  created_at timestamptz default now(),
  unique (event_id, hole_number, group_number)
);

-- Row Level Security: anyone can read (shareable results),
-- only logged-in users can write (you, the scorekeeper).
alter table courses enable row level security;
alter table players enable row level security;
alter table events enable row level security;
alter table rounds enable row level security;
alter table kp_entries enable row level security;

create policy "public read courses" on courses for select using (true);
create policy "auth write courses" on courses for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "public read players" on players for select using (true);
create policy "auth write players" on players for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "public read events" on events for select using (true);
create policy "auth write events" on events for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "public read rounds" on rounds for select using (true);
create policy "auth write rounds" on rounds for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "public read kp_entries" on kp_entries for select using (true);
create policy "auth write kp_entries" on kp_entries for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Volleyball Statistics App schema for Supabase Free Plan.
-- Run this file in the Supabase SQL Editor after creating your project.

create extension if not exists pgcrypto;

create schema if not exists private;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

create or replace function private.is_admin()
returns boolean
language sql
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

grant usage on schema private to anon, authenticated;
grant execute on function private.is_admin() to anon, authenticated;

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  logo_url text,
  logo_path text,
  description text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  jersey_number integer not null check (jersey_number between 0 and 99),
  photo_url text,
  photo_path text,
  position text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.player_teams (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (player_id, team_id)
);

do $$
begin
  if not exists (select 1 from pg_type where typname = 'match_status') then
    create type public.match_status as enum ('scheduled', 'in_progress', 'completed', 'cancelled');
  end if;
end $$;

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  team_a_id uuid not null references public.teams(id) on delete cascade,
  team_b_id uuid not null references public.teams(id) on delete cascade,
  match_date date not null,
  status public.match_status not null default 'scheduled',
  team_a_score integer check (team_a_score is null or team_a_score >= 0),
  team_b_score integer check (team_b_score is null or team_b_score >= 0),
  remarks text,
  video_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (team_a_id <> team_b_id)
);

alter table public.matches add column if not exists remarks text;
alter table public.matches add column if not exists video_url text;

create table if not exists public.match_stats (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  attack integer not null default 0 check (attack >= 0),
  block integer not null default 0 check (block >= 0),
  ace integer not null default 0 check (ace >= 0),
  dig integer not null default 0 check (dig >= 0),
  attack_error integer not null default 0 check (attack_error >= 0),
  serve_error integer not null default 0 check (serve_error >= 0),
  receive_error integer not null default 0 check (receive_error >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, team_id, player_id)
);

create index if not exists teams_name_idx on public.teams (lower(name));
create index if not exists teams_archived_idx on public.teams (archived);
create index if not exists players_name_idx on public.players (lower(name));
create index if not exists players_archived_idx on public.players (archived);
create index if not exists player_teams_player_idx on public.player_teams (player_id);
create index if not exists player_teams_team_idx on public.player_teams (team_id);
create index if not exists matches_date_idx on public.matches (match_date desc);
create index if not exists matches_status_idx on public.matches (status);
create index if not exists match_stats_match_idx on public.match_stats (match_id);
create index if not exists match_stats_team_idx on public.match_stats (team_id);
create index if not exists match_stats_player_idx on public.match_stats (player_id);

alter table public.admin_users enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.player_teams enable row level security;
alter table public.matches enable row level security;
alter table public.match_stats enable row level security;

drop policy if exists "Admins can view admin users" on public.admin_users;
create policy "Admins can view admin users"
on public.admin_users for select
to authenticated
using (private.is_admin() or user_id = (select auth.uid()));

drop policy if exists "Admins can manage admin users" on public.admin_users;
create policy "Admins can manage admin users"
on public.admin_users for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "Anyone can read teams" on public.teams;
create policy "Anyone can read teams" on public.teams for select to anon, authenticated using (true);
drop policy if exists "Admins can manage teams" on public.teams;
create policy "Admins can manage teams" on public.teams for all to authenticated using (private.is_admin()) with check (private.is_admin());

drop policy if exists "Anyone can read players" on public.players;
create policy "Anyone can read players" on public.players for select to anon, authenticated using (true);
drop policy if exists "Admins can manage players" on public.players;
create policy "Admins can manage players" on public.players for all to authenticated using (private.is_admin()) with check (private.is_admin());

drop policy if exists "Anyone can read player teams" on public.player_teams;
create policy "Anyone can read player teams" on public.player_teams for select to anon, authenticated using (true);
drop policy if exists "Admins can manage player teams" on public.player_teams;
create policy "Admins can manage player teams" on public.player_teams for all to authenticated using (private.is_admin()) with check (private.is_admin());

drop policy if exists "Anyone can read matches" on public.matches;
create policy "Anyone can read matches" on public.matches for select to anon, authenticated using (true);
drop policy if exists "Admins can manage matches" on public.matches;
create policy "Admins can manage matches" on public.matches for all to authenticated using (private.is_admin()) with check (private.is_admin());

drop policy if exists "Anyone can read match stats" on public.match_stats;
create policy "Anyone can read match stats" on public.match_stats for select to anon, authenticated using (true);
drop policy if exists "Admins can manage match stats" on public.match_stats;
create policy "Admins can manage match stats" on public.match_stats for all to authenticated using (private.is_admin()) with check (private.is_admin());

insert into storage.buckets (id, name, public)
values
  ('team-logos', 'team-logos', true),
  ('player-photos', 'player-photos', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Anyone can read volleyball images" on storage.objects;
create policy "Anyone can read volleyball images"
on storage.objects for select
to anon, authenticated
using (bucket_id in ('team-logos', 'player-photos'));

drop policy if exists "Admins can upload volleyball images" on storage.objects;
create policy "Admins can upload volleyball images"
on storage.objects for insert
to authenticated
with check (bucket_id in ('team-logos', 'player-photos') and private.is_admin());

drop policy if exists "Admins can update volleyball images" on storage.objects;
create policy "Admins can update volleyball images"
on storage.objects for update
to authenticated
using (bucket_id in ('team-logos', 'player-photos') and private.is_admin())
with check (bucket_id in ('team-logos', 'player-photos') and private.is_admin());

drop policy if exists "Admins can delete volleyball images" on storage.objects;
create policy "Admins can delete volleyball images"
on storage.objects for delete
to authenticated
using (bucket_id in ('team-logos', 'player-photos') and private.is_admin());

-- Seed data. Safe to rerun.
with inserted_teams as (
  insert into public.teams (id, name, description)
  values
    ('00000000-0000-4000-8000-000000000001', 'Sharks', 'Fast tempo offense with strong serve pressure.'),
    ('00000000-0000-4000-8000-000000000002', 'Eagles', 'Balanced rotation with reliable passing.'),
    ('00000000-0000-4000-8000-000000000003', 'Waves', 'Defensive team with long rally control.')
  on conflict (id) do update set name = excluded.name, description = excluded.description
  returning id
),
inserted_players as (
  insert into public.players (id, name, jersey_number, position)
  values
    ('10000000-0000-4000-8000-000000000001', 'Aiden Morales', 1, 'OH'),
    ('10000000-0000-4000-8000-000000000002', 'Jordan Kim', 5, 'MB'),
    ('10000000-0000-4000-8000-000000000003', 'Liam Reyes', 8, 'OPP'),
    ('10000000-0000-4000-8000-000000000004', 'Sophie Chen', 11, 'S'),
    ('10000000-0000-4000-8000-000000000005', 'Mateo Lopez', 14, 'L')
  on conflict (id) do update set name = excluded.name, jersey_number = excluded.jersey_number, position = excluded.position
  returning id
)
insert into public.player_teams (player_id, team_id)
values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000002'),
  ('10000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000003'),
  ('10000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000002'),
  ('10000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000003')
on conflict (player_id, team_id) do nothing;

insert into public.matches (id, team_a_id, team_b_id, match_date, status, team_a_score, team_b_score, remarks)
values
  ('20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', '2026-05-01', 'completed', 3, 1, 'Strong serve pressure carried the first two sets.'),
  ('20000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', '2026-05-05', 'in_progress', 1, 1, 'Match paused after two close sets.')
on conflict (id) do update set status = excluded.status, team_a_score = excluded.team_a_score, team_b_score = excluded.team_b_score, remarks = excluded.remarks;

insert into public.match_stats (
  match_id, team_id, player_id, attack, block, ace, dig, attack_error, serve_error, receive_error
)
values
  ('20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 18, 3, 4, 10, 2, 1, 1),
  ('20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 10, 5, 1, 6, 1, 0, 0),
  ('20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000003', 15, 2, 2, 8, 3, 1, 2),
  ('20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000005', 2, 0, 1, 17, 0, 1, 1),
  ('20000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000004', 7, 1, 3, 12, 1, 0, 1)
on conflict (match_id, team_id, player_id) do update set
  attack = excluded.attack,
  block = excluded.block,
  ace = excluded.ace,
  dig = excluded.dig,
  attack_error = excluded.attack_error,
  serve_error = excluded.serve_error,
  receive_error = excluded.receive_error;

-- After creating your first Supabase Auth user, add them as admin:
-- insert into public.admin_users (user_id, email)
-- values ('AUTH_USER_UUID_HERE', 'admin@example.com');

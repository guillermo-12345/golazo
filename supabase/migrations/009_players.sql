-- =============================================
-- MIGRATION 009 — Plantel de jugadores por selección
-- =============================================
-- Permite elegir el goleador desde una lista (no texto libre).
-- Datos sincronizados de API-Football vía /api/players/sync.
-- Tambien arregla "Chequia" -> "República Checa" en partidos ya cargados.

create table if not exists public.players (
  id uuid primary key default uuid_generate_v4(),
  team_code text not null,
  api_player_id integer,
  name text not null,
  position text,
  number integer,
  created_at timestamptz not null default now(),
  unique (team_code, name)
);

create index if not exists idx_players_team on public.players(team_code);

alter table public.players enable row level security;

drop policy if exists "players_select" on public.players;
create policy "players_select" on public.players for select using (true);

-- Cache de IDs de API-Football resueltos por selección (evita re-resolver)
create table if not exists public.api_team_ids (
  team_code text primary key,
  api_team_id integer not null,
  resolved_at timestamptz not null default now()
);

alter table public.api_team_ids enable row level security;

drop policy if exists "api_team_ids_select" on public.api_team_ids;
create policy "api_team_ids_select" on public.api_team_ids for select using (true);

-- =============================================
-- Fix "Chequia" -> "República Checa" en partidos ya cargados
-- =============================================
update public.matches set home_team = 'República Checa' where home_team = 'Chequia';
update public.matches set away_team = 'República Checa' where away_team = 'Chequia';

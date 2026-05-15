-- =============================================
-- 007 — Partidos de Eliminatorias (Preeliminares) al Mundial 2026
-- =============================================
-- Tabla SEPARADA de `matches` a propósito: estos partidos NO entran en
-- predicciones ni scoring. Son solo informativos (camino de cada selección
-- a la Copa del Mundo). Los datos provienen exclusivamente de API-Football
-- vía /api/qualifiers/sync — nunca se cargan a mano.

create table if not exists public.qualifier_matches (
  id uuid primary key default uuid_generate_v4(),
  api_fixture_id integer unique not null,
  confederation text not null,            -- UEFA, CONMEBOL, CAF, AFC, CONCACAF, OFC, PLAYOFF
  league_round text,                      -- ej. "Group A - 3", "Play-offs"
  home_team text not null,
  away_team text not null,
  home_team_logo text,
  away_team_logo text,
  home_team_code text,                    -- code FIFA interno (resuelto), o null si no es país del Mundial
  away_team_code text,
  scheduled_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','live','finished','postponed')),
  home_score integer,
  away_score integer,
  venue text,
  extra_data jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now()
);

create index if not exists idx_qmatches_home_code on public.qualifier_matches(home_team_code);
create index if not exists idx_qmatches_away_code on public.qualifier_matches(away_team_code);
create index if not exists idx_qmatches_scheduled on public.qualifier_matches(scheduled_at);

alter table public.qualifier_matches enable row level security;

-- Lectura pública (solo informativo, no sensible)
create policy "qmatches_select" on public.qualifier_matches
  for select using (true);

-- Escritura solo vía service role (el endpoint de sync usa la service key,
-- que bypassa RLS). No se define policy de insert/update para usuarios.

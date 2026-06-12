-- =============================================
-- GOLAZO - Schema de base de datos
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- Extensiones
create extension if not exists "uuid-ossp";
create extension if not exists "pg_cron";

-- =============================================
-- PROFILES (extiende auth.users)
-- =============================================
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  display_name text not null,
  avatar_config jsonb not null default '{"skin":"light","hair":"short","hairColor":"black","jersey":"classic","jerseyColor":"green","accessory":null}'::jsonb,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint username_length check (char_length(username) >= 3 and char_length(username) <= 20),
  constraint username_format check (username ~ '^[a-zA-Z0-9_]+$')
);

-- =============================================
-- LEAGUES
-- =============================================
create table public.leagues (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  type text not null check (type in ('global', 'public', 'private')),
  invite_code text unique,
  config jsonb not null default '{
    "advancedOptions": {
      "enabled": false,
      "firstScorer": false,
      "goalMinute": false,
      "yellowCards": false,
      "redCards": false,
      "corners": false,
      "firstTeamToScore": false,
      "halftimeResult": false
    },
    "multipliers": {
      "exactScore": 5,
      "correctWinner": 1,
      "correctDraw": 3,
      "winnerWithDiff": 4
    },
    "allowWildcards": true,
    "allowBracketChallenge": true
  }'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  is_verified boolean not null default false,
  max_members integer,
  banner_color text not null default '#16a34a'
);

-- =============================================
-- LEAGUE MEMBERS
-- =============================================
create table public.league_members (
  league_id uuid references public.leagues(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  points integer not null default 0,
  rank integer,
  joined_at timestamptz not null default now(),
  wildcards jsonb not null default '{
    "todo_o_nada": {"total": 3, "used": 0},
    "escudo": {"total": 3, "used": 0},
    "ladron": {"total": 3, "used": 0}
  }'::jsonb,
  primary key (league_id, user_id)
);

-- =============================================
-- MATCHES (datos de API-Football)
-- =============================================
create table public.matches (
  id uuid primary key default uuid_generate_v4(),
  api_fixture_id integer unique not null,
  home_team text not null,
  away_team text not null,
  home_team_logo text not null,
  away_team_logo text not null,
  home_team_code text not null,
  away_team_code text not null,
  scheduled_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'live', 'finished', 'postponed')),
  home_score integer,
  away_score integer,
  stage text not null,
  group_name text,
  venue text,
  minute integer,
  extra_data jsonb not null default '{}'::jsonb
);

-- =============================================
-- QUALIFIER MATCHES (Preeliminares — solo informativo, ver migración 007)
-- =============================================
create table public.qualifier_matches (
  id uuid primary key default uuid_generate_v4(),
  api_fixture_id integer unique not null,
  confederation text not null,
  league_round text,
  home_team text not null,
  away_team text not null,
  home_team_logo text,
  away_team_logo text,
  home_team_code text,
  away_team_code text,
  scheduled_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','live','finished','postponed')),
  home_score integer,
  away_score integer,
  venue text,
  extra_data jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now()
);
create index idx_qmatches_home_code on public.qualifier_matches(home_team_code);
create index idx_qmatches_away_code on public.qualifier_matches(away_team_code);
create index idx_qmatches_scheduled on public.qualifier_matches(scheduled_at);

-- =============================================
-- PREDICTIONS
-- =============================================
create table public.predictions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  match_id uuid references public.matches(id) on delete cascade not null,
  league_id uuid references public.leagues(id) on delete cascade not null,
  home_score_pred integer not null check (home_score_pred >= 0),
  away_score_pred integer not null check (away_score_pred >= 0),
  advanced_picks jsonb not null default '{}'::jsonb,
  points_wagered integer not null default 0,
  points_earned integer,
  wildcard_used text check (wildcard_used in ('todo_o_nada', 'escudo', 'ladron')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, match_id, league_id)
);

-- =============================================
-- BRACKET PREDICTIONS
-- =============================================
create table public.bracket_predictions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  league_id uuid references public.leagues(id) on delete cascade not null,
  bracket_data jsonb not null default '{}'::jsonb,
  points_earned integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, league_id)
);

-- =============================================
-- BADGES
-- =============================================
create table public.badges (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  badge_type text not null,
  earned_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique (user_id, badge_type)
);

-- =============================================
-- REACTIONS
-- =============================================
create table public.reactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  prediction_id uuid references public.predictions(id) on delete cascade not null,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (user_id, prediction_id)
);

-- =============================================
-- ÍNDICES para performance
-- =============================================
create index idx_matches_scheduled_at on public.matches(scheduled_at);
create index idx_matches_status on public.matches(status);
create index idx_predictions_user_league on public.predictions(user_id, league_id);
create index idx_predictions_match on public.predictions(match_id);
create index idx_league_members_league on public.league_members(league_id);
create index idx_league_members_points on public.league_members(league_id, points desc);
create index idx_badges_user on public.badges(user_id);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
alter table public.profiles enable row level security;
alter table public.leagues enable row level security;
alter table public.league_members enable row level security;
alter table public.matches enable row level security;
alter table public.qualifier_matches enable row level security;
alter table public.predictions enable row level security;
alter table public.bracket_predictions enable row level security;
alter table public.badges enable row level security;
alter table public.reactions enable row level security;

-- Profiles: todos pueden leer, solo el dueño puede escribir
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- Leagues: todos pueden leer, autenticados pueden crear, dueño puede editar
create policy "leagues_select" on public.leagues for select using (true);
create policy "leagues_insert" on public.leagues for insert with check (auth.uid() = created_by);
create policy "leagues_update" on public.leagues for update using (auth.uid() = created_by);

-- League members: todos pueden leer, autenticados pueden unirse/salir
create policy "league_members_select" on public.league_members for select using (true);
create policy "league_members_insert" on public.league_members for insert with check (auth.uid() = user_id);
create policy "league_members_delete" on public.league_members for delete using (auth.uid() = user_id);
create policy "league_members_update" on public.league_members for update using (true);

-- Matches: todos pueden leer (son datos públicos del torneo)
create policy "matches_select" on public.matches for select using (true);

-- Qualifier matches: lectura pública (solo informativo)
create policy "qmatches_select" on public.qualifier_matches for select using (true);

-- Predictions: el dueño puede crear/editar, todos pueden leer las de ligas donde participan
create policy "predictions_select" on public.predictions for select using (
  exists (
    select 1 from public.league_members
    where league_id = predictions.league_id and user_id = auth.uid()
  )
);
create policy "predictions_insert" on public.predictions for insert with check (auth.uid() = user_id);
create policy "predictions_update" on public.predictions for update using (auth.uid() = user_id);

-- Bracket predictions
create policy "bracket_select" on public.bracket_predictions for select using (
  exists (
    select 1 from public.league_members
    where league_id = bracket_predictions.league_id and user_id = auth.uid()
  )
);
create policy "bracket_insert" on public.bracket_predictions for insert with check (auth.uid() = user_id);
create policy "bracket_update" on public.bracket_predictions for update using (auth.uid() = user_id);

-- Badges: todos pueden leer
create policy "badges_select" on public.badges for select using (true);

-- Reactions: todos pueden leer, autenticados pueden crear
create policy "reactions_select" on public.reactions for select using (true);
create policy "reactions_insert" on public.reactions for insert with check (auth.uid() = user_id);
create policy "reactions_delete" on public.reactions for delete using (auth.uid() = user_id);

-- =============================================
-- TRIGGER: auto-crear perfil al registrarse
-- =============================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  -- El perfil se completa en el onboarding, esto solo reserva el ID
  return new;
end;
$$;

-- =============================================
-- TRIGGER: updated_at automático
-- =============================================
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger predictions_updated_at
  before update on public.predictions
  for each row execute procedure public.handle_updated_at();

create trigger bracket_updated_at
  before update on public.bracket_predictions
  for each row execute procedure public.handle_updated_at();

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

-- =============================================
-- FUNCIÓN: calcular puntos de una predicción
-- =============================================
create or replace function public.calculate_prediction_points(
  p_home_pred integer,
  p_away_pred integer,
  p_home_real integer,
  p_away_real integer,
  p_config jsonb,
  p_wildcard text default null
)
returns integer
language plpgsql
as $$
declare
  v_points integer := 0;
  v_exact_score integer;
  v_correct_winner integer;
  v_correct_draw integer;
  v_winner_with_diff integer;
begin
  v_exact_score := (p_config->'multipliers'->>'exactScore')::integer;
  v_correct_winner := (p_config->'multipliers'->>'correctWinner')::integer;
  v_correct_draw := (p_config->'multipliers'->>'correctDraw')::integer;
  v_winner_with_diff := (p_config->'multipliers'->>'winnerWithDiff')::integer;

  if p_home_pred = p_home_real and p_away_pred = p_away_real then
    -- Resultado exacto
    v_points := v_exact_score;
  elsif (p_home_pred - p_away_pred) = (p_home_real - p_away_real) and p_home_real != p_away_real then
    -- Ganador correcto con misma diferencia de goles
    v_points := v_winner_with_diff;
  elsif p_home_pred = p_away_pred and p_home_real = p_away_real then
    -- Empate correcto
    v_points := v_correct_draw;
  elsif (p_home_pred > p_away_pred and p_home_real > p_away_real) or
        (p_home_pred < p_away_pred and p_home_real < p_away_real) then
    -- Solo ganador correcto
    v_points := v_correct_winner;
  end if;

  -- Comodín "Todo o Nada": doble si acierta, -2 si no
  if p_wildcard = 'todo_o_nada' then
    if v_points > 0 then
      v_points := v_points * 2;
    else
      v_points := -2;
    end if;
  end if;

  return v_points;
end;
$$;

-- =============================================
-- LIGA GLOBAL (se crea automáticamente)
-- =============================================
insert into public.leagues (id, name, description, type, config, created_by, is_verified, banner_color)
values (
  '00000000-0000-0000-0000-000000000001',
  'Liga Global Golazo',
  'La liga oficial donde compiten todos los usuarios de Golazo',
  'global',
  '{
    "advancedOptions": {"enabled": false, "firstScorer": false, "goalMinute": false, "yellowCards": false, "redCards": false, "corners": false, "firstTeamToScore": false, "halftimeResult": false},
    "multipliers": {"exactScore": 5, "correctWinner": 1, "correctDraw": 3, "winnerWithDiff": 4},
    "allowWildcards": true,
    "allowBracketChallenge": true
  }'::jsonb,
  null,
  true,
  '#16a34a'
) on conflict (id) do nothing;

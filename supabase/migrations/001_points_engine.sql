-- =============================================
-- MIGRATION 001 — Motor de puntos automático
-- Ejecutar en Supabase SQL Editor DESPUÉS del schema.sql inicial
-- =============================================

-- =============================================
-- FUNCIÓN: actualizar ranking de una liga
-- =============================================
create or replace function public.update_league_ranks(p_league_id uuid)
returns void
language plpgsql
as $$
begin
  with ranked as (
    select user_id, rank() over (order by points desc, joined_at asc) as new_rank
    from public.league_members
    where league_id = p_league_id
  )
  update public.league_members lm
  set rank = r.new_rank
  from ranked r
  where lm.user_id = r.user_id
    and lm.league_id = p_league_id;
end;
$$;

-- =============================================
-- FUNCIÓN: recalcular todas las predicciones de un partido
-- Se ejecuta cuando un match cambia a status='finished' con scores
-- =============================================
create or replace function public.recalculate_match_points(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match record;
  v_pred record;
  v_points integer;
  v_league_config jsonb;
  v_affected_leagues uuid[];
begin
  -- Obtener datos del partido
  select id, home_score, away_score, status
  into v_match
  from public.matches
  where id = p_match_id;

  if not found or v_match.status != 'finished'
     or v_match.home_score is null or v_match.away_score is null then
    return;
  end if;

  -- Para cada predicción de este partido, calcular puntos
  for v_pred in
    select p.id, p.user_id, p.league_id,
           p.home_score_pred, p.away_score_pred,
           p.wildcard_used, p.points_wagered,
           l.config as league_config
    from public.predictions p
    join public.leagues l on l.id = p.league_id
    where p.match_id = p_match_id
  loop
    v_points := public.calculate_prediction_points(
      v_pred.home_score_pred,
      v_pred.away_score_pred,
      v_match.home_score,
      v_match.away_score,
      v_pred.league_config,
      v_pred.wildcard_used
    );

    update public.predictions
    set points_earned = v_points
    where id = v_pred.id;
  end loop;

  -- Recalcular puntos totales de cada miembro afectado
  with affected as (
    select distinct league_id, user_id
    from public.predictions
    where match_id = p_match_id
  )
  update public.league_members lm
  set points = coalesce((
    select sum(coalesce(p.points_earned, 0))
    from public.predictions p
    where p.user_id = lm.user_id and p.league_id = lm.league_id
  ), 0)
  from affected a
  where lm.user_id = a.user_id and lm.league_id = a.league_id;

  -- Recolectar ligas afectadas y actualizar rankings
  select array_agg(distinct league_id) into v_affected_leagues
  from public.predictions
  where match_id = p_match_id;

  if v_affected_leagues is not null then
    for i in 1 .. array_length(v_affected_leagues, 1) loop
      perform public.update_league_ranks(v_affected_leagues[i]);
    end loop;
  end if;
end;
$$;

-- =============================================
-- TRIGGER: cuando un match se marca como 'finished', recalcular
-- =============================================
create or replace function public.handle_match_finished()
returns trigger
language plpgsql
as $$
begin
  -- Solo si pasó a finished con scores válidos
  if new.status = 'finished'
     and new.home_score is not null
     and new.away_score is not null
     and (
       old.status is distinct from 'finished'
       or old.home_score is distinct from new.home_score
       or old.away_score is distinct from new.away_score
     )
  then
    perform public.recalculate_match_points(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists on_match_finished on public.matches;
create trigger on_match_finished
  after update on public.matches
  for each row execute procedure public.handle_match_finished();

-- =============================================
-- ENDPOINT (RPC) para llamar manualmente el recálculo
-- =============================================
-- Útil para testing o si querés recalcular toda una jornada
create or replace function public.recalculate_all_finished_matches()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match_id uuid;
  v_count integer := 0;
begin
  for v_match_id in
    select id from public.matches where status = 'finished'
      and home_score is not null and away_score is not null
  loop
    perform public.recalculate_match_points(v_match_id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- =============================================
-- TABLA: log de sincronizaciones (para debugging)
-- =============================================
create table if not exists public.sync_log (
  id uuid primary key default uuid_generate_v4(),
  source text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  matches_synced integer,
  matches_finished integer,
  error text
);

create index if not exists idx_sync_log_started on public.sync_log(started_at desc);

-- =============================================
-- MIGRATION 016 — Comodines Ladrón y Escudo funcionando
-- =============================================
-- Hasta ahora solo "Todo o Nada" tenía efecto. Ladrón y Escudo se podían
-- elegir pero no hacían nada. Ahora:
--
--   LADRÓN: si usás Ladrón en un partido y acertás (puntos > 0), le robás
--           2 puntos al LÍDER de la liga. No podés robarte a vos mismo.
--   ESCUDO: si sos el líder y usás Escudo en un partido, ningún Ladrón te
--           roba puntos en ese partido (te blindás).
--
-- Implementación idempotente con un ledger (wildcard_steals): el efecto se
-- recalcula desde cero en cada settle, así correr el recálculo N veces da
-- siempre el mismo resultado. El total de cada jugador es:
--   sum(predicciones) + bonus diario + robados − perdidos
--
-- El "líder" se determina por puntos base (predicciones + bonus), sin
-- contar robos, para evitar circularidad.

-- Ledger de robos: una fila por (liga, partido, ladrón)
create table if not exists public.wildcard_steals (
  id uuid primary key default uuid_generate_v4(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  thief_user_id uuid not null references public.profiles(id) on delete cascade,
  victim_user_id uuid not null references public.profiles(id) on delete cascade,
  points integer not null default 2,
  created_at timestamptz not null default now(),
  unique (league_id, match_id, thief_user_id)
);

alter table public.wildcard_steals enable row level security;
drop policy if exists "wildcard_steals_select" on public.wildcard_steals;
create policy "wildcard_steals_select" on public.wildcard_steals for select using (
  exists (
    select 1 from public.league_members lm
    where lm.league_id = wildcard_steals.league_id and lm.user_id = auth.uid()
  )
);

-- =============================================
-- settle_league_wildcards: recomputa robos y totales de una liga
-- =============================================
create or replace function public.settle_league_wildcards(p_league_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_leader uuid;
begin
  -- Líder por puntos base (predicciones + bonus diario), desempate por antigüedad
  with base as (
    select lm.user_id, lm.joined_at,
      coalesce((
        select sum(coalesce(p.points_earned, 0)) from public.predictions p
        where p.user_id = lm.user_id and p.league_id = p_league_id
      ), 0)
      + coalesce((
        select sum(dc.bonus_points) from public.daily_challenges dc
        where dc.user_id = lm.user_id
      ), 0) as base_points
    from public.league_members lm
    where lm.league_id = p_league_id
  )
  select user_id into v_leader
  from base
  order by base_points desc, joined_at asc
  limit 1;

  -- Recomputar el ledger de esta liga desde cero (idempotente)
  delete from public.wildcard_steals where league_id = p_league_id;

  if v_leader is not null then
    insert into public.wildcard_steals (league_id, match_id, thief_user_id, victim_user_id, points)
    select p_league_id, p.match_id, p.user_id, v_leader, 2
    from public.predictions p
    join public.matches m on m.id = p.match_id
    where p.league_id = p_league_id
      and p.wildcard_used = 'ladron'
      and p.user_id <> v_leader                    -- no te robás a vos mismo
      and m.status = 'finished'
      and coalesce(p.points_earned, 0) > 0          -- solo si acertó el partido
      and not exists (                              -- el líder no escudó ese partido
        select 1 from public.predictions e
        where e.league_id = p_league_id
          and e.user_id = v_leader
          and e.match_id = p.match_id
          and e.wildcard_used = 'escudo'
      )
    on conflict (league_id, match_id, thief_user_id) do nothing;
  end if;

  -- Total final = base + robados − perdidos
  update public.league_members lm
  set points =
      coalesce((
        select sum(coalesce(p.points_earned, 0)) from public.predictions p
        where p.user_id = lm.user_id and p.league_id = p_league_id
      ), 0)
    + coalesce((
        select sum(dc.bonus_points) from public.daily_challenges dc
        where dc.user_id = lm.user_id
      ), 0)
    + coalesce((
        select sum(s.points) from public.wildcard_steals s
        where s.league_id = p_league_id and s.thief_user_id = lm.user_id
      ), 0)
    - coalesce((
        select sum(s.points) from public.wildcard_steals s
        where s.league_id = p_league_id and s.victim_user_id = lm.user_id
      ), 0)
  where lm.league_id = p_league_id;

  perform public.update_league_ranks(p_league_id);
end;
$$;

-- =============================================
-- recalculate_match_points: ahora delega los totales a settle (con robos)
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
  v_basic_points integer;
  v_advanced_points integer;
  v_total_points integer;
  v_affected_leagues uuid[];
  v_exact_count integer;
begin
  select id, home_score, away_score, status, extra_data
  into v_match
  from public.matches
  where id = p_match_id;

  if not found or v_match.status != 'finished'
     or v_match.home_score is null or v_match.away_score is null then
    return;
  end if;

  for v_pred in
    select p.id, p.user_id, p.league_id,
           p.home_score_pred, p.away_score_pred,
           p.advanced_picks,
           p.wildcard_used, p.points_wagered,
           l.config as league_config
    from public.predictions p
    join public.leagues l on l.id = p.league_id
    where p.match_id = p_match_id
  loop
    v_basic_points := public.calculate_prediction_points(
      v_pred.home_score_pred,
      v_pred.away_score_pred,
      v_match.home_score,
      v_match.away_score,
      v_pred.league_config,
      v_pred.wildcard_used
    );

    v_advanced_points := 0;
    if (v_pred.league_config->'advancedOptions'->>'enabled')::boolean = true then
      v_advanced_points := public.calculate_advanced_points(
        v_pred.advanced_picks,
        v_match.extra_data,
        v_pred.league_config
      );
    end if;

    v_total_points := v_basic_points + v_advanced_points;

    update public.predictions
    set points_earned = v_total_points
    where id = v_pred.id;

    if v_total_points > 0 and not exists (
      select 1 from public.notifications n
      where n.user_id = v_pred.user_id
        and n.type = 'points_earned'
        and n.metadata->>'match_id' = p_match_id::text
    ) then
      insert into public.notifications (user_id, type, title, message, link, metadata)
      values (
        v_pred.user_id,
        'points_earned',
        '+' || v_total_points || ' puntos',
        case
          when v_advanced_points > 0 then
            'Tu predicción sumó ' || v_basic_points || ' + ' || v_advanced_points || ' bonus avanzadas'
          else
            'Tu predicción del partido sumó puntos'
        end,
        '/partidos/' || p_match_id,
        jsonb_build_object('match_id', p_match_id, 'points', v_total_points, 'advanced', v_advanced_points)
      );
    end if;

    if v_pred.home_score_pred = v_match.home_score
       and v_pred.away_score_pred = v_match.away_score then
      select count(*) into v_exact_count
      from public.predictions p
      join public.matches m on m.id = p.match_id
      where p.user_id = v_pred.user_id
        and m.status = 'finished'
        and p.home_score_pred = m.home_score
        and p.away_score_pred = m.away_score;

      if v_exact_count >= 3 then
        perform public.grant_badge(v_pred.user_id, 'adivino');
      end if;
    end if;
  end loop;

  -- Ligas afectadas → liquidar totales (base + bonus + robos de comodines)
  select array_agg(distinct league_id) into v_affected_leagues
  from public.predictions
  where match_id = p_match_id;

  if v_affected_leagues is not null then
    for i in 1 .. array_length(v_affected_leagues, 1) loop
      perform public.settle_league_wildcards(v_affected_leagues[i]);
    end loop;
  end if;

  -- Badge "mil_puntos" (después de liquidar)
  insert into public.badges (user_id, badge_type)
  select distinct user_id, 'mil_puntos'
  from public.league_members
  where points >= 1000
    and user_id in (
      select distinct user_id from public.predictions where match_id = p_match_id
    )
  on conflict (user_id, badge_type) do nothing;
end;
$$;

-- =============================================
-- Corrección única: liquidar todas las ligas con la nueva mecánica
-- =============================================
do $$
declare l uuid;
begin
  for l in select distinct league_id from public.league_members loop
    perform public.settle_league_wildcards(l);
  end loop;
end $$;

do $$
begin
  raise notice '✅ Comodines Ladrón y Escudo activos (2 usos por liga se controla en la app)';
end $$;

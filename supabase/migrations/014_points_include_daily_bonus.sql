-- =============================================
-- MIGRATION 014 — Los puntos de liga incluyen el bonus del desafío diario
-- =============================================
-- Bug: league_members.points sale de DOS fuentes — la suma de
-- predicciones (points_earned) y el bonus del desafío diario (que
-- complete_daily_challenge / claim_daily_challenge_results suman aparte).
-- Pero recalculate_match_points fijaba points = SOLO suma de predicciones,
-- borrando el bonus diario cada vez que se recalculaba o terminaba un
-- partido. Resultado: jugadores con desafío diario completado perdían
-- esos puntos.
--
-- Fix: el total por liga ahora siempre es
--     sum(predicciones de esa liga) + sum(bonus diario del usuario)
-- El bonus diario aplica por igual a todas las ligas del usuario (así lo
-- otorgan las funciones del desafío), por eso se suma completo en cada una.

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

    -- Notif con dedup (no repite si ya existe para este partido)
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

    -- Badge "adivino": 3+ resultados exactos
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

  -- Total por liga = suma de predicciones + bonus del desafío diario
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
    + coalesce((
      select sum(dc.bonus_points)
      from public.daily_challenges dc
      where dc.user_id = lm.user_id
    ), 0)
  from affected a
  where lm.user_id = a.user_id and lm.league_id = a.league_id;

  -- Badge "mil_puntos"
  insert into public.badges (user_id, badge_type)
  select distinct user_id, 'mil_puntos'
  from public.league_members
  where points >= 1000
    and user_id in (
      select distinct user_id from public.predictions where match_id = p_match_id
    )
  on conflict (user_id, badge_type) do nothing;

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
-- Corrección única: recomputar TODOS los totales con la fórmula correcta
-- (restaura los bonus diarios que el recálculo anterior pudo borrar)
-- =============================================
update public.league_members lm
set points = coalesce((
    select sum(coalesce(p.points_earned, 0))
    from public.predictions p
    where p.user_id = lm.user_id and p.league_id = lm.league_id
  ), 0)
  + coalesce((
    select sum(dc.bonus_points)
    from public.daily_challenges dc
    where dc.user_id = lm.user_id
  ), 0);

-- Recalcular rankings de todas las ligas
do $$
declare l uuid;
begin
  for l in select distinct league_id from public.league_members loop
    perform public.update_league_ranks(l);
  end loop;
end $$;

do $$
begin
  raise notice '✅ Puntos = predicciones + bonus diario. Totales corregidos.';
end $$;

-- =============================================
-- MIGRATION 006 — Scoring de predicciones avanzadas
-- =============================================
-- Cuando un partido termina, el sync trae events + statistics y los guarda
-- en matches.extra_data. Esta funcion valida las predicciones avanzadas
-- contra esa data y otorga puntos extra.
--
-- Esquema esperado de extra_data (despues del sync con detalles):
-- {
--   "firstScorer": "Lionel Messi",
--   "firstScorerTeam": "Argentina",
--   "firstGoalMinute": 23,
--   "firstTeamToScore": "home",  -- "home" o "away"
--   "halftime": {"home": 1, "away": 0},
--   "corners": {"home": 5, "away": 3},
--   "yellowCards": {"home": 2, "away": 4},
--   "redCards": {"home": 0, "away": 1},
--   ...
-- }
--
-- Esquema esperado de advanced_picks (lo que el usuario apuesta):
-- {
--   "firstScorer": "Lionel Messi",
--   "firstTeamToScore": "home",
--   "goalMinute": "16-30",    -- rango de 15 min
--   "halftimeResult": "1-0",
--   "totalYellowCards": "4-6", -- rango
--   "anyRedCard": "yes",       -- "yes" o "no"
--   "totalCorners": "7-10"     -- rango
-- }
-- =============================================

create or replace function public.calculate_advanced_points(
  p_picks jsonb,
  p_extra jsonb,
  p_league_config jsonb
)
returns integer
language plpgsql
as $$
declare
  v_points integer := 0;
  v_pick text;
  v_actual jsonb;
  v_total_corners int;
  v_total_yellow int;
  v_total_red int;
begin
  if p_picks is null or p_picks = '{}'::jsonb or p_extra is null then
    return 0;
  end if;

  -- 1. Goleador del partido (x5)
  v_pick := p_picks->>'firstScorer';
  if v_pick is not null and v_pick != '' then
    if lower(coalesce(p_extra->>'firstScorer', '')) like '%' || lower(v_pick) || '%' then
      v_points := v_points + 5;
    end if;
  end if;

  -- 2. Primer equipo en marcar (x3)
  v_pick := p_picks->>'firstTeamToScore';
  if v_pick is not null and v_pick in ('home', 'away') then
    if p_extra->>'firstTeamToScore' = v_pick then
      v_points := v_points + 3;
    end if;
  end if;

  -- 3. Minuto del primer gol — rango de 15 min (x4)
  v_pick := p_picks->>'goalMinute';
  if v_pick is not null and v_pick != '' then
    declare
      v_minute int := coalesce((p_extra->>'firstGoalMinute')::int, -1);
      v_from int;
      v_to int;
    begin
      -- formato esperado: "0-15", "16-30", etc.
      v_from := split_part(v_pick, '-', 1)::int;
      v_to := split_part(v_pick, '-', 2)::int;
      if v_minute >= v_from and v_minute <= v_to then
        v_points := v_points + 4;
      end if;
    exception when others then
      -- formato invalido, ignorar
      null;
    end;
  end if;

  -- 4. Resultado al descanso (x3)
  v_pick := p_picks->>'halftimeResult';
  if v_pick is not null and v_pick != '' then
    v_actual := p_extra->'halftime';
    if v_actual is not null
       and v_pick = (v_actual->>'home') || '-' || (v_actual->>'away')
    then
      v_points := v_points + 3;
    end if;
  end if;

  -- 5. Total de tarjetas amarillas — rango (x2)
  v_pick := p_picks->>'totalYellowCards';
  if v_pick is not null and v_pick != '' then
    v_total_yellow := coalesce((p_extra->'yellowCards'->>'home')::int, 0) +
                      coalesce((p_extra->'yellowCards'->>'away')::int, 0);
    declare
      v_from int := split_part(v_pick, '-', 1)::int;
      v_to int := split_part(v_pick, '-', 2)::int;
    begin
      if v_total_yellow >= v_from and v_total_yellow <= v_to then
        v_points := v_points + 2;
      end if;
    exception when others then null;
    end;
  end if;

  -- 6. Hubo tarjeta roja? (x3)
  v_pick := p_picks->>'anyRedCard';
  if v_pick is not null and v_pick in ('yes', 'no') then
    v_total_red := coalesce((p_extra->'redCards'->>'home')::int, 0) +
                   coalesce((p_extra->'redCards'->>'away')::int, 0);
    if (v_pick = 'yes' and v_total_red > 0) or (v_pick = 'no' and v_total_red = 0) then
      v_points := v_points + 3;
    end if;
  end if;

  -- 7. Total de corners — rango (x2)
  v_pick := p_picks->>'totalCorners';
  if v_pick is not null and v_pick != '' then
    v_total_corners := coalesce((p_extra->'corners'->>'home')::int, 0) +
                       coalesce((p_extra->'corners'->>'away')::int, 0);
    declare
      v_from int := split_part(v_pick, '-', 1)::int;
      v_to int := split_part(v_pick, '-', 2)::int;
    begin
      if v_total_corners >= v_from and v_total_corners <= v_to then
        v_points := v_points + 2;
      end if;
    exception when others then null;
    end;
  end if;

  return v_points;
end;
$$;

-- =============================================
-- ACTUALIZAR recalculate_match_points para sumar puntos avanzados
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
    -- Puntos basicos (resultado del partido)
    v_basic_points := public.calculate_prediction_points(
      v_pred.home_score_pred,
      v_pred.away_score_pred,
      v_match.home_score,
      v_match.away_score,
      v_pred.league_config,
      v_pred.wildcard_used
    );

    -- Puntos avanzados (apuestas extra) — solo si la liga tiene avanzadas activas
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

    -- Notif si gano puntos
    if v_total_points > 0 then
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

  -- Actualizar puntos totales por liga
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

  -- Badge "mil_puntos"
  insert into public.badges (user_id, badge_type)
  select distinct user_id, 'mil_puntos'
  from public.league_members
  where points >= 1000
    and user_id in (
      select distinct user_id from public.predictions where match_id = p_match_id
    )
  on conflict (user_id, badge_type) do nothing;

  -- Actualizar rankings
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

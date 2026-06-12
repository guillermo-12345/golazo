-- =============================================
-- MIGRATION 011 — Rebalanceo de puntajes por probabilidad
-- =============================================
-- Problema: apuestas fáciles pagaban igual o más que apuestas difíciles.
-- Ejemplos del sistema viejo:
--   - "¿Habrá roja?" = NO acierta ~75% de las veces y pagaba +3 (regalo).
--     "Resultado al descanso" (exacto, ~15-20%) pagaba los mismos +3.
--   - "Primer equipo en marcar" (~45%) pagaba +3; "Minuto del primer gol"
--     (1 de 6 rangos, ~15%) pagaba solo +4. Convenía llenar lo fácil.
--   - Básicas: "empate no exacto" (+4) pagaba MÁS que "ganador con misma
--     diferencia" (+3), siendo esta última más difícil de acertar.
--
-- Nuevo criterio: puntos ≈ proporcionales a la dificultad, con valor
-- esperado parejo (~0.7-0.9 pts por apuesta). Probabilidades aproximadas
-- de fútbol de selecciones:
--
--   Apuesta                        P(acierto)   Antes  Ahora
--   Primer goleador                  ~12%         5      6
--   Minuto del primer gol (6 rangos) ~15%         4      5
--   Resultado exacto al descanso     ~15-20%      3      4
--   Tarjeta roja = SÍ                ~25%         3      4
--   Amarillas/córners/tiros/faltas   ~25-30%      2      3
--   Primer equipo en marcar          ~45%         3      2
--   Más posesión                     ~48%         2      1
--   Tarjeta roja = NO                ~75%         3      1
--
-- Básicas (multipliers por liga): se intercambian empate y diferencia:
--   exacto 5 · ganador+diferencia 4 (antes 3) · empate no exacto 3
--   (antes 4) · solo ganador 1
--
-- Los valores de la UI viven en src/lib/scoring-values.ts — mantener
-- sincronizados con esta función.
--
-- NO se recalculan los partidos ya jugados: ninguna predicción puntuada
-- hasta ahora cae en los casos que cambian (solo hubo exactos +5 y
-- ganador +1), así que el histórico ya es consistente con las reglas
-- nuevas y un recálculo solo duplicaría notificaciones.

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

  -- 1. Primer goleador del partido (+6 · ~12%)
  v_pick := p_picks->>'firstScorer';
  if v_pick is not null and v_pick != '' then
    if lower(coalesce(p_extra->>'firstScorer', '')) like '%' || lower(v_pick) || '%' then
      v_points := v_points + 6;
    end if;
  end if;

  -- 2. Primer equipo en marcar (+2 · ~45%)
  v_pick := p_picks->>'firstTeamToScore';
  if v_pick is not null and v_pick in ('home', 'away') then
    if p_extra->>'firstTeamToScore' = v_pick then
      v_points := v_points + 2;
    end if;
  end if;

  -- 3. Minuto del primer gol — rango de 15 min (+5 · ~15%)
  v_pick := p_picks->>'goalMinute';
  if v_pick is not null and v_pick != '' then
    declare
      v_minute int := coalesce((p_extra->>'firstGoalMinute')::int, -1);
      v_from int;
      v_to int;
    begin
      v_from := split_part(v_pick, '-', 1)::int;
      v_to := split_part(v_pick, '-', 2)::int;
      if v_minute >= v_from and v_minute <= v_to then
        v_points := v_points + 5;
      end if;
    exception when others then
      null;
    end;
  end if;

  -- 4. Resultado exacto al descanso (+4 · ~15-20%)
  v_pick := p_picks->>'halftimeResult';
  if v_pick is not null and v_pick != '' then
    v_actual := p_extra->'halftime';
    if v_actual is not null
       and v_pick = (v_actual->>'home') || '-' || (v_actual->>'away')
    then
      v_points := v_points + 4;
    end if;
  end if;

  -- 5. Total de tarjetas amarillas — rango (+3 · ~25-30%)
  v_pick := p_picks->>'totalYellowCards';
  if v_pick is not null and v_pick != '' then
    v_total_yellow := coalesce((p_extra->'yellowCards'->>'home')::int, 0) +
                      coalesce((p_extra->'yellowCards'->>'away')::int, 0);
    declare
      v_from int := split_part(v_pick, '-', 1)::int;
      v_to int := split_part(v_pick, '-', 2)::int;
    begin
      if v_total_yellow >= v_from and v_total_yellow <= v_to then
        v_points := v_points + 3;
      end if;
    exception when others then null;
    end;
  end if;

  -- 6. ¿Hubo tarjeta roja? — asimétrico: SÍ +4 (~25%) · NO +1 (~75%)
  v_pick := p_picks->>'anyRedCard';
  if v_pick is not null and v_pick in ('yes', 'no') then
    v_total_red := coalesce((p_extra->'redCards'->>'home')::int, 0) +
                   coalesce((p_extra->'redCards'->>'away')::int, 0);
    if v_pick = 'yes' and v_total_red > 0 then
      v_points := v_points + 4;
    elsif v_pick = 'no' and v_total_red = 0 then
      v_points := v_points + 1;
    end if;
  end if;

  -- 7. Total de córners — rango (+3 · ~25-30%)
  v_pick := p_picks->>'totalCorners';
  if v_pick is not null and v_pick != '' then
    v_total_corners := coalesce((p_extra->'corners'->>'home')::int, 0) +
                       coalesce((p_extra->'corners'->>'away')::int, 0);
    declare
      v_from int := split_part(v_pick, '-', 1)::int;
      v_to int := split_part(v_pick, '-', 2)::int;
    begin
      if v_total_corners >= v_from and v_total_corners <= v_to then
        v_points := v_points + 3;
      end if;
    exception when others then null;
    end;
  end if;

  -- 8. Equipo con más posesión (+1 · ~48%)
  v_pick := p_picks->>'morePossession';
  if v_pick is not null and v_pick in ('home', 'away') then
    declare
      v_home_pos int := coalesce((p_extra->'possession'->>'home')::int, 0);
      v_away_pos int := coalesce((p_extra->'possession'->>'away')::int, 0);
      v_actual_winner text;
    begin
      if v_home_pos > v_away_pos then v_actual_winner := 'home';
      elsif v_away_pos > v_home_pos then v_actual_winner := 'away';
      else v_actual_winner := null;
      end if;
      if v_actual_winner = v_pick then
        v_points := v_points + 1;
      end if;
    end;
  end if;

  -- 9. Total de tiros — rango (+3 · ~25-30%)
  v_pick := p_picks->>'totalShots';
  if v_pick is not null and v_pick != '' then
    declare
      v_total_shots int := coalesce((p_extra->'totalShots'->>'home')::int, 0) +
                          coalesce((p_extra->'totalShots'->>'away')::int, 0);
      v_from int := split_part(v_pick, '-', 1)::int;
      v_to int := split_part(v_pick, '-', 2)::int;
    begin
      if v_total_shots >= v_from and v_total_shots <= v_to then
        v_points := v_points + 3;
      end if;
    exception when others then null;
    end;
  end if;

  -- 10. Total de faltas — rango (+3 · ~25-30%)
  v_pick := p_picks->>'totalFouls';
  if v_pick is not null and v_pick != '' then
    declare
      v_total_fouls int := coalesce((p_extra->'fouls'->>'home')::int, 0) +
                          coalesce((p_extra->'fouls'->>'away')::int, 0);
      v_from int := split_part(v_pick, '-', 1)::int;
      v_to int := split_part(v_pick, '-', 2)::int;
    begin
      if v_total_fouls >= v_from and v_total_fouls <= v_to then
        v_points := v_points + 3;
      end if;
    exception when others then null;
    end;
  end if;

  return v_points;
end;
$$;

-- =============================================
-- Básicas: intercambiar empate (4→3) y ganador con diferencia (3→4)
-- en TODAS las ligas existentes (la config vive por liga en jsonb)
-- =============================================
update public.leagues
set config = jsonb_set(
  jsonb_set(config, '{multipliers,correctDraw}', '3'::jsonb),
  '{multipliers,winnerWithDiff}', '4'::jsonb
)
where config ? 'multipliers';

do $$
begin
  raise notice '✅ Puntajes rebalanceados por probabilidad (avanzadas + básicas)';
end $$;

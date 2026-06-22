-- =============================================
-- MIGRATION 022 — Quitar el bonus de +1 por goles de un equipo
-- =============================================
-- El +1 por acertar los goles exactos de UN equipo (migración 020) resultó
-- demasiado frecuente: lo recibía ~52% de las predicciones, inflando los
-- totales y achicando la diferencia entre acertar bien y tener suerte. Se
-- revierte calculate_prediction_points a la versión sin ese bonus.
--
-- Tras aplicar, correr:  select public.recalculate_all_finished_matches();
-- (recalcula todos los partidos: los de antes del +1 quedan igual, los que
-- se habían puntuado con el +1 lo pierden — sin notificaciones duplicadas).

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

  -- Comodín "Todo o Nada": doble si acierta algo, -2 si no
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

do $$ begin raise notice '✅ Bonus de +1 por goles de un equipo eliminado'; end $$;

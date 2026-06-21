-- =============================================
-- MIGRATION 020 — Bonus por acertar los goles de un equipo
-- =============================================
-- +1 punto si acertás los goles EXACTOS de uno de los dos equipos, aunque
-- falles el otro (ej. predijiste 2-1 y salió 2-3: acertaste los 2 del local).
-- No aplica si ya es resultado exacto (que vale el máximo). Se suma al
-- puntaje básico antes del comodín Todo-o-Nada. Aplica a todas las ligas.
--
-- Tras aplicar, correr: select public.recalculate_all_finished_matches();

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

  -- Bonus +1: acertar los goles exactos de UN equipo (no si ya es exacto)
  if not (p_home_pred = p_home_real and p_away_pred = p_away_real)
     and (p_home_pred = p_home_real or p_away_pred = p_away_real) then
    v_points := v_points + 1;
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

do $$
begin
  raise notice '✅ Bonus +1 por goles de un equipo activo. Corré: select public.recalculate_all_finished_matches();';
end $$;

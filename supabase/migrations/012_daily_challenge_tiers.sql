-- =============================================
-- MIGRATION 012 — Desafío diario por niveles (más desafiante)
-- =============================================
-- Antes: predecir todos los partidos del día = +10 pts. Puro esfuerzo,
-- cero habilidad. Ahora son 3 niveles (alineado con el rebalanceo 011:
-- lo fácil paga poco, la puntería paga bien):
--
--   🥉 Participación: predecir TODOS los partidos del día ........ +5
--   🥈 Puntería: acertar el 1X2 en al menos la MITAD del día ..... +10
--   🥇 Francotirador: clavar al menos UN resultado exacto ........ +15
--
-- Participación se otorga al completar las predicciones (como antes).
-- Puntería y Francotirador se verifican cuando TERMINARON todos los
-- partidos del día, contra los resultados reales.
--
-- Valores espejados en src/lib/scoring-values.ts (DAILY_CHALLENGE_POINTS).

-- Columnas nuevas para los niveles por resultado
alter table public.daily_challenges
  add column if not exists results_checked boolean not null default false,
  add column if not exists skill_reward_given boolean not null default false,
  add column if not exists exact_reward_given boolean not null default false;

-- =============================================
-- Nivel 1 — Participación: ahora paga +5 (antes +10)
-- =============================================
create or replace function public.complete_daily_challenge(p_date date)
returns jsonb
security definer
set search_path = public
language plpgsql
as $$
declare
  v_user_id uuid;
  v_already_completed boolean;
  v_matches_today integer;
  v_matches_predicted integer;
  v_bonus integer := 5;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select reward_given into v_already_completed
  from public.daily_challenges
  where user_id = v_user_id and challenge_date = p_date;

  if v_already_completed then
    return jsonb_build_object('ok', true, 'already_rewarded', true);
  end if;

  select count(*) into v_matches_today
  from public.matches
  where date(scheduled_at at time zone 'UTC') = p_date;

  if v_matches_today = 0 then
    return jsonb_build_object('ok', false, 'error', 'no_matches_today');
  end if;

  select count(distinct p.match_id) into v_matches_predicted
  from public.predictions p
  join public.matches m on m.id = p.match_id
  where p.user_id = v_user_id
    and date(m.scheduled_at at time zone 'UTC') = p_date;

  if v_matches_predicted < v_matches_today then
    insert into public.daily_challenges (user_id, challenge_date, matches_total, matches_predicted, completed, reward_given)
    values (v_user_id, p_date, v_matches_today, v_matches_predicted, false, false)
    on conflict (user_id, challenge_date) do update
    set matches_total = excluded.matches_total,
        matches_predicted = excluded.matches_predicted,
        updated_at = now();

    return jsonb_build_object(
      'ok', true,
      'completed', false,
      'matches_total', v_matches_today,
      'matches_predicted', v_matches_predicted
    );
  end if;

  insert into public.daily_challenges (user_id, challenge_date, matches_total, matches_predicted, completed, reward_given, bonus_points)
  values (v_user_id, p_date, v_matches_today, v_matches_predicted, true, true, v_bonus)
  on conflict (user_id, challenge_date) do update
  set matches_predicted = excluded.matches_predicted,
      completed = true,
      reward_given = true,
      bonus_points = daily_challenges.bonus_points + v_bonus,
      updated_at = now();

  update public.league_members
  set points = points + v_bonus
  where user_id = v_user_id;

  insert into public.notifications (user_id, type, title, message, link, metadata)
  values (
    v_user_id,
    'daily_challenge_complete',
    '🎯 ¡Desafío diario: participación!',
    'Predijiste todos los partidos del día. +' || v_bonus || ' puntos en todas tus ligas. Ahora a acertar: Puntería paga +10 y un exacto +15.',
    '/dashboard',
    jsonb_build_object('date', p_date, 'bonus', v_bonus)
  );

  return jsonb_build_object(
    'ok', true,
    'completed', true,
    'reward_given', true,
    'bonus_points', v_bonus,
    'matches_total', v_matches_today
  );
end;
$$;

grant execute on function public.complete_daily_challenge(date) to authenticated;

-- =============================================
-- Niveles 2 y 3 — verificación contra resultados reales del día
-- =============================================
-- Se llama desde el cliente cuando todos los partidos del día terminaron.
-- Idempotente: results_checked evita dobles premios.
create or replace function public.claim_daily_challenge_results(p_date date)
returns jsonb
security definer
set search_path = public
language plpgsql
as $$
declare
  v_user_id uuid;
  v_total integer;
  v_finished integer;
  v_wins integer;
  v_exacts integer;
  v_target integer;
  v_skill_won boolean;
  v_exact_won boolean;
  v_already boolean;
  v_award integer := 0;
  v_skill_bonus integer := 10;
  v_exact_bonus integer := 15;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select count(*),
         count(*) filter (where status = 'finished' and home_score is not null)
  into v_total, v_finished
  from public.matches
  where date(scheduled_at at time zone 'UTC') = p_date;

  if v_total = 0 then
    return jsonb_build_object('ok', false, 'error', 'no_matches_today');
  end if;

  -- Todavía hay partidos sin terminar: solo informar progreso
  if v_finished < v_total then
    return jsonb_build_object('ok', true, 'pending', true, 'finished', v_finished, 'total', v_total);
  end if;

  -- ¿Ya se verificó este día?
  select results_checked into v_already
  from public.daily_challenges
  where user_id = v_user_id and challenge_date = p_date;

  if v_already then
    return (
      select jsonb_build_object(
        'ok', true, 'checked', true, 'already', true,
        'skill_won', dc.skill_reward_given,
        'exact_won', dc.exact_reward_given
      )
      from public.daily_challenges dc
      where dc.user_id = v_user_id and dc.challenge_date = p_date
    );
  end if;

  -- Aciertos del usuario en el día (si predijo en varias ligas, cuenta
  -- el partido una sola vez si alguna predicción acertó)
  select
    count(distinct m.id) filter (where
      (p.home_score_pred > p.away_score_pred and m.home_score > m.away_score) or
      (p.home_score_pred < p.away_score_pred and m.home_score < m.away_score) or
      (p.home_score_pred = p.away_score_pred and m.home_score = m.away_score)
    ),
    count(distinct m.id) filter (where
      p.home_score_pred = m.home_score and p.away_score_pred = m.away_score
    )
  into v_wins, v_exacts
  from public.predictions p
  join public.matches m on m.id = p.match_id
  where p.user_id = v_user_id
    and date(m.scheduled_at at time zone 'UTC') = p_date;

  v_target := ceil(v_total / 2.0);
  v_skill_won := v_wins >= v_target;
  v_exact_won := v_exacts >= 1;

  if v_skill_won then v_award := v_award + v_skill_bonus; end if;
  if v_exact_won then v_award := v_award + v_exact_bonus; end if;

  insert into public.daily_challenges
    (user_id, challenge_date, matches_total, matches_predicted, results_checked,
     skill_reward_given, exact_reward_given, bonus_points)
  values
    (v_user_id, p_date, v_total, 0, true, v_skill_won, v_exact_won, v_award)
  on conflict (user_id, challenge_date) do update
  set results_checked = true,
      skill_reward_given = v_skill_won,
      exact_reward_given = v_exact_won,
      bonus_points = daily_challenges.bonus_points + v_award,
      updated_at = now();

  if v_award > 0 then
    update public.league_members
    set points = points + v_award
    where user_id = v_user_id;

    insert into public.notifications (user_id, type, title, message, link, metadata)
    values (
      v_user_id,
      'daily_challenge_complete',
      case
        when v_skill_won and v_exact_won then '🏆 ¡Puntería + Francotirador!'
        when v_exact_won then '🎯 ¡Francotirador del día!'
        else '🥈 ¡Puntería del día!'
      end,
      case
        when v_skill_won and v_exact_won then
          'Acertaste ' || v_wins || ' de ' || v_total || ' y clavaste un exacto. +' || v_award || ' puntos en todas tus ligas.'
        when v_exact_won then
          'Clavaste un resultado exacto hoy. +' || v_award || ' puntos en todas tus ligas.'
        else
          'Acertaste el resultado en ' || v_wins || ' de ' || v_total || ' partidos. +' || v_award || ' puntos en todas tus ligas.'
      end,
      '/dashboard',
      jsonb_build_object('date', p_date, 'bonus', v_award, 'wins', v_wins, 'exacts', v_exacts)
    );
  end if;

  return jsonb_build_object(
    'ok', true, 'checked', true,
    'wins', v_wins, 'target', v_target, 'exacts', v_exacts,
    'skill_won', v_skill_won, 'exact_won', v_exact_won,
    'awarded', v_award
  );
end;
$$;

grant execute on function public.claim_daily_challenge_results(date) to authenticated;

do $$
begin
  raise notice '✅ Desafío diario por niveles: participación +5, puntería +10, exacto +15';
end $$;

-- =============================================
-- MIGRATION 017 — Desafío diario: puntos más chicos (1/2/3) + ranking
-- =============================================
-- El desafío daba demasiado: 5/10/15. Ahora 1/2/3:
--   Participación (predecir todos los del día) ... +1
--   Puntería (acertar 1X2 en la mitad) .......... +2
--   Francotirador (un resultado exacto) ......... +3
--
-- Además arregla un bug: las funciones del desafío sumaban puntos pero NO
-- recalculaban el ranking. Ahora delegan el total a settle_league_wildcards
-- (que recomputa puntos = predicciones + bonus + robos, y los ranks) para
-- todas las ligas del usuario. Así el bonus diario reordena la tabla.
--
-- Se aplica retroactivamente: recomputa el bonus de los desafíos ya dados
-- y reliquida todas las ligas.

-- Nivel 1 — Participación: +1 (antes +5)
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
  v_bonus integer := 1;
  v_league record;
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
    return jsonb_build_object('ok', true, 'completed', false,
      'matches_total', v_matches_today, 'matches_predicted', v_matches_predicted);
  end if;

  insert into public.daily_challenges (user_id, challenge_date, matches_total, matches_predicted, completed, reward_given, bonus_points)
  values (v_user_id, p_date, v_matches_today, v_matches_predicted, true, true, v_bonus)
  on conflict (user_id, challenge_date) do update
  set matches_predicted = excluded.matches_predicted,
      completed = true,
      reward_given = true,
      bonus_points = daily_challenges.bonus_points + v_bonus,
      updated_at = now();

  -- Reliquidar todas las ligas del usuario (puntos + ranking)
  for v_league in select league_id from public.league_members where user_id = v_user_id loop
    perform public.settle_league_wildcards(v_league.league_id);
  end loop;

  insert into public.notifications (user_id, type, title, message, link, metadata)
  values (v_user_id, 'daily_challenge_complete', '🎯 ¡Desafío diario: participación!',
    'Predijiste todos los partidos del día. +' || v_bonus || ' punto. Ahora a acertar: Puntería +2 y un exacto +3.',
    '/dashboard', jsonb_build_object('date', p_date, 'bonus', v_bonus));

  return jsonb_build_object('ok', true, 'completed', true, 'reward_given', true,
    'bonus_points', v_bonus, 'matches_total', v_matches_today);
end;
$$;

-- Niveles 2 y 3 — Puntería +2, Francotirador +3 (antes 10/15)
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
  v_skill_bonus integer := 2;
  v_exact_bonus integer := 3;
  v_league record;
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

  if v_finished < v_total then
    return jsonb_build_object('ok', true, 'pending', true, 'finished', v_finished, 'total', v_total);
  end if;

  select results_checked into v_already
  from public.daily_challenges
  where user_id = v_user_id and challenge_date = p_date;

  if v_already then
    return (select jsonb_build_object('ok', true, 'checked', true, 'already', true,
      'skill_won', dc.skill_reward_given, 'exact_won', dc.exact_reward_given)
      from public.daily_challenges dc
      where dc.user_id = v_user_id and dc.challenge_date = p_date);
  end if;

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
    for v_league in select league_id from public.league_members where user_id = v_user_id loop
      perform public.settle_league_wildcards(v_league.league_id);
    end loop;

    insert into public.notifications (user_id, type, title, message, link, metadata)
    values (v_user_id, 'daily_challenge_complete',
      case when v_skill_won and v_exact_won then '🏆 ¡Puntería + Francotirador!'
           when v_exact_won then '🎯 ¡Francotirador del día!'
           else '🥈 ¡Puntería del día!' end,
      case when v_skill_won and v_exact_won then
             'Acertaste ' || v_wins || ' de ' || v_total || ' y clavaste un exacto. +' || v_award || ' puntos.'
           when v_exact_won then 'Clavaste un resultado exacto hoy. +' || v_award || ' puntos.'
           else 'Acertaste el resultado en ' || v_wins || ' de ' || v_total || '. +' || v_award || ' puntos.' end,
      '/dashboard', jsonb_build_object('date', p_date, 'bonus', v_award, 'wins', v_wins, 'exacts', v_exacts));
  end if;

  return jsonb_build_object('ok', true, 'checked', true, 'wins', v_wins, 'target', v_target,
    'exacts', v_exacts, 'skill_won', v_skill_won, 'exact_won', v_exact_won, 'awarded', v_award);
end;
$$;

-- =============================================
-- Retroactivo: recomputar bonus ya dados (1/2/3) y reliquidar todo
-- =============================================
update public.daily_challenges
set bonus_points =
    (case when reward_given then 1 else 0 end)
  + (case when skill_reward_given then 2 else 0 end)
  + (case when exact_reward_given then 3 else 0 end);

do $$
declare l uuid;
begin
  for l in select distinct league_id from public.league_members loop
    perform public.settle_league_wildcards(l);
  end loop;
end $$;

do $$
begin
  raise notice '✅ Desafío diario 1/2/3 + ranking reliquidado';
end $$;

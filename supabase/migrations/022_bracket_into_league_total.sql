-- =============================================
-- MIGRATION 022 — Los puntos del Bracket Challenge cuentan en la liga
-- =============================================
-- El bracket_predictions.points_earned (podio + goleador del torneo) no se
-- sumaba al total de cada liga. Ahora settle_league_wildcards lo incluye,
-- consistente con "cada acierto suma puntos a tu liga". Al final re-liquida
-- todas las ligas para aplicar el cambio.
--
-- Total por liga = predicciones + bonus diario + bracket + robados − perdidos

create or replace function public.settle_league_wildcards(p_league_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_leader uuid;
begin
  -- Líder por puntos base (predicciones + bonus + bracket), sin robos
  with base as (
    select lm.user_id, lm.joined_at,
      coalesce((
        select sum(coalesce(p.points_earned, 0)) from public.predictions p
        where p.user_id = lm.user_id and p.league_id = p_league_id
      ), 0)
      + coalesce((
        select sum(dc.bonus_points) from public.daily_challenges dc
        where dc.user_id = lm.user_id
      ), 0)
      + coalesce((
        select sum(bp.points_earned) from public.bracket_predictions bp
        where bp.user_id = lm.user_id and bp.league_id = p_league_id
      ), 0) as base_points
    from public.league_members lm
    where lm.league_id = p_league_id
  )
  select user_id into v_leader
  from base
  order by base_points desc, joined_at asc
  limit 1;

  delete from public.wildcard_steals where league_id = p_league_id;

  if v_leader is not null then
    insert into public.wildcard_steals (league_id, match_id, thief_user_id, victim_user_id, points)
    select p_league_id, p.match_id, p.user_id, v_leader, 2
    from public.predictions p
    join public.matches m on m.id = p.match_id
    where p.league_id = p_league_id
      and p.wildcard_used = 'ladron'
      and p.user_id <> v_leader
      and m.status = 'finished'
      and coalesce(p.points_earned, 0) > 0
      and not exists (
        select 1 from public.predictions e
        where e.league_id = p_league_id
          and e.user_id = v_leader
          and e.match_id = p.match_id
          and e.wildcard_used = 'escudo'
      )
    on conflict (league_id, match_id, thief_user_id) do nothing;
  end if;

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
        select sum(bp.points_earned) from public.bracket_predictions bp
        where bp.user_id = lm.user_id and bp.league_id = p_league_id
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

-- Re-liquidar todas las ligas para sumar el bracket ya puntuado
do $$
declare l uuid;
begin
  for l in select distinct league_id from public.league_members loop
    perform public.settle_league_wildcards(l);
  end loop;
end $$;

do $$ begin raise notice '✅ Bracket Challenge sumando al total de cada liga'; end $$;

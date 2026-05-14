-- =============================================
-- MIGRATION 004 — Daily Challenges
-- =============================================
-- Tabla para trackear cuando un usuario completó el desafío diario
-- (predecir todos los partidos del día) y recibir bonificación.

create table if not exists public.daily_challenges (
  user_id uuid references public.profiles(id) on delete cascade not null,
  challenge_date date not null,
  matches_total integer not null,
  matches_predicted integer not null,
  completed boolean not null default false,
  reward_given boolean not null default false,
  bonus_points integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, challenge_date)
);

create index if not exists idx_daily_challenges_date on public.daily_challenges(challenge_date);

alter table public.daily_challenges enable row level security;

drop policy if exists "daily_challenges_select" on public.daily_challenges;
create policy "daily_challenges_select" on public.daily_challenges for select
using (auth.uid() = user_id);

drop policy if exists "daily_challenges_insert" on public.daily_challenges for insert;
create policy "daily_challenges_insert" on public.daily_challenges for insert
with check (auth.uid() = user_id);

drop policy if exists "daily_challenges_update" on public.daily_challenges;
create policy "daily_challenges_update" on public.daily_challenges for update
using (auth.uid() = user_id);

-- =============================================
-- FUNCIÓN: completar challenge del día (otorga +10 puntos bonus)
-- Se llama desde el cliente cuando detecta que el usuario predijo todos
-- los partidos del día.
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
  v_bonus integer := 10;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  -- ¿Ya recibió la recompensa hoy?
  select reward_given into v_already_completed
  from public.daily_challenges
  where user_id = v_user_id and challenge_date = p_date;

  if v_already_completed then
    return jsonb_build_object('ok', true, 'already_rewarded', true);
  end if;

  -- Contar partidos del día
  select count(*) into v_matches_today
  from public.matches
  where date(scheduled_at at time zone 'UTC') = p_date;

  if v_matches_today = 0 then
    return jsonb_build_object('ok', false, 'error', 'no_matches_today');
  end if;

  -- Contar predicciones del usuario hechas para esos partidos
  -- (consideramos una unica liga por partido, si predijo en multiples ligas cuenta como una)
  select count(distinct p.match_id) into v_matches_predicted
  from public.predictions p
  join public.matches m on m.id = p.match_id
  where p.user_id = v_user_id
    and date(m.scheduled_at at time zone 'UTC') = p_date;

  if v_matches_predicted < v_matches_today then
    -- Solo actualizar progreso, no dar recompensa
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

  -- ¡Completó! Otorgar recompensa
  insert into public.daily_challenges (user_id, challenge_date, matches_total, matches_predicted, completed, reward_given, bonus_points)
  values (v_user_id, p_date, v_matches_today, v_matches_predicted, true, true, v_bonus)
  on conflict (user_id, challenge_date) do update
  set matches_predicted = excluded.matches_predicted,
      completed = true,
      reward_given = true,
      bonus_points = v_bonus,
      updated_at = now();

  -- Sumar puntos bonus en TODAS las ligas del usuario
  update public.league_members
  set points = points + v_bonus
  where user_id = v_user_id;

  -- Crear notificación
  insert into public.notifications (user_id, type, title, message, link, metadata)
  values (
    v_user_id,
    'daily_challenge_complete',
    '🎯 ¡Desafío diario completado!',
    'Predijiste todos los partidos del día. +' || v_bonus || ' puntos bonus en todas tus ligas',
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

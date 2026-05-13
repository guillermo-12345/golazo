-- =============================================
-- MIGRATION 002 — Badges, Activity Feed, Notifications
-- Ejecutar DESPUÉS del schema.sql y la migration 001
-- =============================================

-- =============================================
-- TABLA: league_activity (feed de actividad por liga)
-- =============================================
create table if not exists public.league_activity (
  id uuid primary key default uuid_generate_v4(),
  league_id uuid references public.leagues(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade,
  action_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_activity_league on public.league_activity(league_id, created_at desc);

alter table public.league_activity enable row level security;

drop policy if exists "activity_select" on public.league_activity;
create policy "activity_select" on public.league_activity for select
using (
  exists (
    select 1 from public.league_members
    where league_id = league_activity.league_id and user_id = auth.uid()
  )
);

-- =============================================
-- TABLA: notifications (campana del usuario)
-- =============================================
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null,
  title text not null,
  message text,
  link text,
  metadata jsonb not null default '{}'::jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user on public.notifications(user_id, created_at desc);
create index if not exists idx_notifications_unread on public.notifications(user_id, read) where read = false;

alter table public.notifications enable row level security;

drop policy if exists "notif_select" on public.notifications;
create policy "notif_select" on public.notifications for select
using (auth.uid() = user_id);

drop policy if exists "notif_update" on public.notifications;
create policy "notif_update" on public.notifications for update
using (auth.uid() = user_id);

-- =============================================
-- FUNCIÓN: helper para otorgar badge (idempotente)
-- =============================================
create or replace function public.grant_badge(p_user_id uuid, p_badge_type text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted boolean := false;
  v_badge_name text;
begin
  insert into public.badges (user_id, badge_type)
  values (p_user_id, p_badge_type)
  on conflict (user_id, badge_type) do nothing
  returning true into v_inserted;

  if v_inserted then
    -- Crear notificación
    v_badge_name := initcap(replace(p_badge_type, '_', ' '));
    insert into public.notifications (user_id, type, title, message, link, metadata)
    values (
      p_user_id,
      'badge_earned',
      '¡Nuevo logro!',
      'Desbloqueaste: ' || v_badge_name,
      '/perfil',
      jsonb_build_object('badge_type', p_badge_type)
    );
  end if;

  return coalesce(v_inserted, false);
end;
$$;

-- =============================================
-- TRIGGER: dar badge "bienvenido" al crear perfil
-- =============================================
create or replace function public.handle_profile_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.grant_badge(new.id, 'bienvenido');
  return new;
end;
$$;

drop trigger if exists on_profile_created on public.profiles;
create trigger on_profile_created
  after insert on public.profiles
  for each row execute procedure public.handle_profile_created();

-- =============================================
-- TRIGGER: cuando alguien se une a una liga
-- - activity log
-- - badge "companero" si se unió con código
-- - badge "estratega" si es el creador (primera vez)
-- - notif al creador de la liga
-- =============================================
create or replace function public.handle_league_member_added()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_league record;
  v_user record;
  v_member_count integer;
begin
  select id, name, type, invite_code, created_by
    into v_league
  from public.leagues
  where id = new.league_id;

  select id, username, display_name
    into v_user
  from public.profiles
  where id = new.user_id;

  -- Activity log
  insert into public.league_activity (league_id, user_id, action_type, metadata)
  values (
    new.league_id,
    new.user_id,
    'member_joined',
    jsonb_build_object(
      'display_name', v_user.display_name,
      'username', v_user.username
    )
  );

  -- Badges
  if v_league.created_by = new.user_id then
    perform public.grant_badge(new.user_id, 'estratega');
  elsif v_league.invite_code is not null then
    perform public.grant_badge(new.user_id, 'companero');
  end if;

  -- Notif al creador (si el que se une NO es el creador)
  if v_league.created_by is not null and v_league.created_by <> new.user_id then
    insert into public.notifications (user_id, type, title, message, link, metadata)
    values (
      v_league.created_by,
      'league_joined',
      'Nuevo miembro',
      v_user.display_name || ' se unió a tu liga ' || v_league.name,
      '/ligas/' || v_league.id,
      jsonb_build_object('league_id', v_league.id, 'user_id', new.user_id)
    );

    -- Badge "reclutador" si llegó a 3+ miembros más allá del creador
    select count(*) into v_member_count
    from public.league_members
    where league_id = new.league_id and user_id <> v_league.created_by;

    if v_member_count >= 3 then
      perform public.grant_badge(v_league.created_by, 'reclutador');
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_league_member_added on public.league_members;
create trigger on_league_member_added
  after insert on public.league_members
  for each row execute procedure public.handle_league_member_added();

-- =============================================
-- TRIGGER: cuando se crea una nueva liga
-- =============================================
create or replace function public.handle_league_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_creator record;
begin
  if new.created_by is null then return new; end if;

  select username, display_name
    into v_creator
  from public.profiles
  where id = new.created_by;

  -- Activity (incluso si todavía no hay miembros)
  insert into public.league_activity (league_id, user_id, action_type, metadata)
  values (
    new.id,
    new.created_by,
    'league_created',
    jsonb_build_object(
      'display_name', v_creator.display_name,
      'league_name', new.name
    )
  );

  return new;
end;
$$;

drop trigger if exists on_league_created on public.leagues;
create trigger on_league_created
  after insert on public.leagues
  for each row execute procedure public.handle_league_created();

-- =============================================
-- TRIGGER: cuando se hace/actualiza una predicción
-- - badge "predictor" en la primera predicción
-- =============================================
create or replace function public.handle_prediction_inserted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  -- Es la primera predicción del usuario?
  select count(*) into v_count
  from public.predictions
  where user_id = new.user_id;

  if v_count = 1 then
    perform public.grant_badge(new.user_id, 'predictor');
  end if;

  -- Activity en la liga
  insert into public.league_activity (league_id, user_id, action_type, metadata)
  values (
    new.league_id,
    new.user_id,
    'prediction_made',
    jsonb_build_object('match_id', new.match_id)
  );

  return new;
end;
$$;

drop trigger if exists on_prediction_inserted on public.predictions;
create trigger on_prediction_inserted
  after insert on public.predictions
  for each row execute procedure public.handle_prediction_inserted();

-- =============================================
-- AMPLIAR: recalculate_match_points para chequear badges de aciertos
-- =============================================
-- Reemplazamos la función previa con la nueva versión que también chequea logros
create or replace function public.recalculate_match_points(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match record;
  v_pred record;
  v_points integer;
  v_affected_leagues uuid[];
  v_exact_count integer;
begin
  select id, home_score, away_score, status
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
           p.wildcard_used, p.points_wagered,
           l.config as league_config
    from public.predictions p
    join public.leagues l on l.id = p.league_id
    where p.match_id = p_match_id
  loop
    v_points := public.calculate_prediction_points(
      v_pred.home_score_pred,
      v_pred.away_score_pred,
      v_match.home_score,
      v_match.away_score,
      v_pred.league_config,
      v_pred.wildcard_used
    );

    update public.predictions
    set points_earned = v_points
    where id = v_pred.id;

    -- Notif: ganaste puntos
    if v_points > 0 then
      insert into public.notifications (user_id, type, title, message, link, metadata)
      values (
        v_pred.user_id,
        'points_earned',
        '+' || v_points || ' puntos',
        'Tu predicción del partido sumó puntos',
        '/partidos/' || p_match_id,
        jsonb_build_object('match_id', p_match_id, 'points', v_points)
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

  -- Recalcular puntos totales y rankings (igual que antes)
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

  -- Badge "mil_puntos" después de actualizar
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

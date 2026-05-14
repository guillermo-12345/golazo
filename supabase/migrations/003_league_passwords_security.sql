-- =============================================
-- MIGRATION 003 — Contraseñas para ligas privadas + auditoría de seguridad
-- =============================================

-- Habilitar pgcrypto para bcrypt
create extension if not exists "pgcrypto";

-- =============================================
-- COLUMNA: password_hash en leagues
-- =============================================
alter table public.leagues add column if not exists password_hash text;

-- =============================================
-- RLS más estricto: ligas privadas SOLO visibles para sus miembros
-- (antes: todas las ligas eran visibles, exponiendo invite_codes privados)
-- =============================================
drop policy if exists "leagues_select" on public.leagues;
create policy "leagues_select" on public.leagues for select
using (
  type in ('global', 'public')
  or id in (select league_id from public.league_members where user_id = auth.uid())
);

-- =============================================
-- FUNCIÓN RPC: unirse a una liga con código + contraseña opcional
-- Bypassa RLS via SECURITY DEFINER y maneja todo el flujo de forma segura.
-- =============================================
create or replace function public.join_league_by_code(
  p_invite_code text,
  p_password text default null
)
returns jsonb
security definer
set search_path = public
language plpgsql
as $$
declare
  v_league record;
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  -- Buscar liga por código (case-insensitive)
  select id, name, password_hash, type
    into v_league
  from public.leagues
  where invite_code = upper(p_invite_code);

  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid_code');
  end if;

  -- Verificar contraseña si la liga la requiere
  if v_league.password_hash is not null then
    if p_password is null or p_password = '' then
      return jsonb_build_object('ok', false, 'error', 'password_required', 'league_name', v_league.name);
    end if;
    if v_league.password_hash != crypt(p_password, v_league.password_hash) then
      return jsonb_build_object('ok', false, 'error', 'invalid_password');
    end if;
  end if;

  -- Ya es miembro?
  if exists (
    select 1 from public.league_members
    where league_id = v_league.id and user_id = v_user_id
  ) then
    return jsonb_build_object('ok', true, 'league_id', v_league.id, 'already_member', true);
  end if;

  -- Unirse
  insert into public.league_members (league_id, user_id)
  values (v_league.id, v_user_id);

  return jsonb_build_object('ok', true, 'league_id', v_league.id);
end;
$$;

-- =============================================
-- FUNCIÓN RPC: crear liga con contraseña opcional (hashea con bcrypt)
-- =============================================
create or replace function public.create_league(
  p_name text,
  p_description text,
  p_type text,
  p_invite_code text,
  p_banner_color text,
  p_config jsonb,
  p_password text default null
)
returns jsonb
security definer
set search_path = public
language plpgsql
as $$
declare
  v_user_id uuid;
  v_league_id uuid;
  v_password_hash text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if p_type not in ('public', 'private') then
    return jsonb_build_object('ok', false, 'error', 'invalid_type');
  end if;

  if char_length(coalesce(p_name, '')) < 3 then
    return jsonb_build_object('ok', false, 'error', 'name_too_short');
  end if;

  -- Hashear password con bcrypt si la liga es privada y se proveyó
  if p_password is not null and p_password != '' then
    v_password_hash := crypt(p_password, gen_salt('bf', 10));
  end if;

  insert into public.leagues (
    name, description, type, invite_code, banner_color, config, created_by, password_hash
  )
  values (
    p_name, p_description, p_type, p_invite_code, p_banner_color, p_config, v_user_id, v_password_hash
  )
  returning id into v_league_id;

  -- El creador se une automáticamente
  insert into public.league_members (league_id, user_id) values (v_league_id, v_user_id);

  return jsonb_build_object('ok', true, 'league_id', v_league_id);
end;
$$;

-- =============================================
-- FUNCIÓN RPC: cambiar/quitar contraseña de una liga (solo el creador)
-- =============================================
create or replace function public.set_league_password(
  p_league_id uuid,
  p_password text default null
)
returns jsonb
security definer
set search_path = public
language plpgsql
as $$
declare
  v_user_id uuid;
  v_creator uuid;
  v_new_hash text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select created_by into v_creator
  from public.leagues where id = p_league_id;

  if v_creator is null then
    return jsonb_build_object('ok', false, 'error', 'league_not_found');
  end if;

  if v_creator != v_user_id then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if p_password is null or p_password = '' then
    v_new_hash := null;
  else
    v_new_hash := crypt(p_password, gen_salt('bf', 10));
  end if;

  update public.leagues set password_hash = v_new_hash where id = p_league_id;
  return jsonb_build_object('ok', true);
end;
$$;

-- =============================================
-- FUNCIÓN: chequear si una liga requiere contraseña (público, no expone el hash)
-- =============================================
create or replace function public.league_requires_password(p_invite_code text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case
    when l.id is null then jsonb_build_object('exists', false)
    else jsonb_build_object(
      'exists', true,
      'requires_password', l.password_hash is not null,
      'league_name', l.name,
      'banner_color', l.banner_color
    )
  end
  from public.leagues l
  where l.invite_code = upper(p_invite_code)
  limit 1;
$$;

-- =============================================
-- PERMISOS: las funciones RPC son ejecutables por usuarios autenticados
-- =============================================
grant execute on function public.join_league_by_code(text, text) to authenticated;
grant execute on function public.create_league(text, text, text, text, text, jsonb, text) to authenticated;
grant execute on function public.set_league_password(uuid, text) to authenticated;
grant execute on function public.league_requires_password(text) to authenticated, anon;

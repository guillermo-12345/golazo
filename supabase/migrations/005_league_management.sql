-- =============================================
-- MIGRATION 005 — Gestión de ligas (editar, eliminar, salir)
-- =============================================

-- =============================================
-- RPC: actualizar liga (solo creador)
-- =============================================
create or replace function public.update_league(
  p_league_id uuid,
  p_name text,
  p_description text,
  p_banner_color text,
  p_config jsonb
)
returns jsonb
security definer
set search_path = public
language plpgsql
as $$
declare
  v_user_id uuid;
  v_creator uuid;
  v_type text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select created_by, type into v_creator, v_type
  from public.leagues where id = p_league_id;

  if v_creator is null then
    return jsonb_build_object('ok', false, 'error', 'league_not_found');
  end if;

  if v_type = 'global' then
    return jsonb_build_object('ok', false, 'error', 'cannot_edit_global');
  end if;

  if v_creator != v_user_id then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if char_length(coalesce(p_name, '')) < 3 then
    return jsonb_build_object('ok', false, 'error', 'name_too_short');
  end if;

  update public.leagues
  set name = p_name,
      description = p_description,
      banner_color = p_banner_color,
      config = p_config
  where id = p_league_id;

  return jsonb_build_object('ok', true);
end;
$$;

-- =============================================
-- RPC: eliminar liga (solo creador, no se puede borrar la liga global)
-- ON DELETE CASCADE en tablas relacionadas se ocupa de limpiar todo
-- =============================================
create or replace function public.delete_league(p_league_id uuid)
returns jsonb
security definer
set search_path = public
language plpgsql
as $$
declare
  v_user_id uuid;
  v_creator uuid;
  v_type text;
  v_name text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select created_by, type, name into v_creator, v_type, v_name
  from public.leagues where id = p_league_id;

  if v_creator is null then
    return jsonb_build_object('ok', false, 'error', 'league_not_found');
  end if;

  if v_type = 'global' then
    return jsonb_build_object('ok', false, 'error', 'cannot_delete_global');
  end if;

  if v_creator != v_user_id then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  delete from public.leagues where id = p_league_id;

  return jsonb_build_object('ok', true, 'deleted_name', v_name);
end;
$$;

-- =============================================
-- RPC: salir de una liga (cualquier miembro que NO sea el creador)
-- =============================================
create or replace function public.leave_league(p_league_id uuid)
returns jsonb
security definer
set search_path = public
language plpgsql
as $$
declare
  v_user_id uuid;
  v_creator uuid;
  v_type text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select created_by, type into v_creator, v_type
  from public.leagues where id = p_league_id;

  if v_creator is null then
    return jsonb_build_object('ok', false, 'error', 'league_not_found');
  end if;

  if v_type = 'global' then
    return jsonb_build_object('ok', false, 'error', 'cannot_leave_global');
  end if;

  if v_creator = v_user_id then
    return jsonb_build_object('ok', false, 'error', 'creator_must_delete');
  end if;

  delete from public.league_members
  where league_id = p_league_id and user_id = v_user_id;

  -- Activity log de salida
  insert into public.league_activity (league_id, user_id, action_type, metadata)
  values (
    p_league_id,
    v_user_id,
    'member_left',
    '{}'::jsonb
  );

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.update_league(uuid, text, text, text, jsonb) to authenticated;
grant execute on function public.delete_league(uuid) to authenticated;
grant execute on function public.leave_league(uuid) to authenticated;

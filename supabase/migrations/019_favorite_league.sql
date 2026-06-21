-- =============================================
-- MIGRATION 019 — Liga favorita (aparece primero en el inicio)
-- =============================================
-- Cada usuario puede marcar UNA liga como favorita. Se guarda por membresía.
-- Se actualiza vía RPC (no por RLS directo) para no exponer la edición de
-- puntos: la función solo toca is_favorite de la fila del propio usuario.

alter table public.league_members
  add column if not exists is_favorite boolean not null default false;

create or replace function public.set_favorite_league(p_league_id uuid, p_fav boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_fav then
    -- Solo una favorita por usuario: apaga las demás primero
    update public.league_members
    set is_favorite = false
    where user_id = auth.uid() and is_favorite = true;
  end if;

  update public.league_members
  set is_favorite = p_fav
  where user_id = auth.uid() and league_id = p_league_id;
end;
$$;

grant execute on function public.set_favorite_league(uuid, boolean) to authenticated;

do $$ begin raise notice '✅ Liga favorita lista'; end $$;

-- =============================================
-- MIGRATION 008 — Chat de liga
-- =============================================
-- Mensajes en tiempo real entre miembros de una liga.
-- Solo miembros pueden leer/escribir. Realtime via Supabase.
--
-- IMPORTANTE: después de correr esto, habilitar Realtime para la tabla
-- league_messages en: Supabase Dashboard -> Database -> Replication
-- =============================================

create table if not exists public.league_messages (
  id uuid primary key default uuid_generate_v4(),
  league_id uuid references public.leagues(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  message text not null,
  created_at timestamptz not null default now(),
  constraint message_length check (char_length(message) between 1 and 500)
);

create index if not exists idx_league_messages_league
  on public.league_messages(league_id, created_at desc);

alter table public.league_messages enable row level security;

-- Solo miembros de la liga pueden LEER los mensajes
drop policy if exists "league_messages_select" on public.league_messages;
create policy "league_messages_select" on public.league_messages for select
using (
  exists (
    select 1 from public.league_members
    where league_id = league_messages.league_id
      and user_id = auth.uid()
  )
);

-- Solo miembros pueden ESCRIBIR, y solo como ellos mismos
drop policy if exists "league_messages_insert" on public.league_messages;
create policy "league_messages_insert" on public.league_messages for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.league_members
    where league_id = league_messages.league_id
      and user_id = auth.uid()
  )
);

-- Cada usuario puede BORRAR sus propios mensajes
drop policy if exists "league_messages_delete" on public.league_messages;
create policy "league_messages_delete" on public.league_messages for delete
using (auth.uid() = user_id);

-- =============================================
-- Anti-spam básico: máx 10 mensajes por usuario por minuto
-- =============================================
create or replace function public.check_message_rate_limit()
returns trigger
language plpgsql
as $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.league_messages
  where user_id = new.user_id
    and created_at > now() - interval '1 minute';

  if v_count >= 10 then
    raise exception 'Rate limit: esperá un momento antes de mandar más mensajes';
  end if;

  return new;
end;
$$;

drop trigger if exists message_rate_limit on public.league_messages;
create trigger message_rate_limit
  before insert on public.league_messages
  for each row execute procedure public.check_message_rate_limit();

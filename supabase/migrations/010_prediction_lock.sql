-- =============================================
-- MIGRATION 010 — Cierre de predicciones 65 min antes del partido
-- =============================================
-- Hasta ahora el "cierre" era solo visual (la página calculaba isLocked),
-- pero las políticas RLS aceptaban INSERT/UPDATE en cualquier momento:
-- un usuario podía escribir su predicción por API directo con el partido
-- ya empezado o terminado. Trampa posible.
--
-- Esta migración hace cumplir el corte EN LA BASE:
--   - Solo se puede crear/editar una predicción si el partido sigue
--     'scheduled' y faltan MÁS de 65 minutos para el kickoff
--     (a los ~60-75 min se publican las alineaciones oficiales).
--   - El INSERT además exige ser miembro de la liga.
--
-- OJO: el valor 65 también vive en src/lib/predictions.ts
-- (PREDICTION_LOCK_MINUTES) para la UI. Si lo cambiás, cambialo en ambos.
--
-- El motor de puntos no se ve afectado: recalculate_match_points es
-- SECURITY DEFINER y el service role bypasea RLS.

-- Función auxiliar: ¿se puede todavía predecir este partido?
create or replace function public.prediction_window_open(p_match_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.matches m
    where m.id = p_match_id
      and m.status = 'scheduled'
      and now() < m.scheduled_at - interval '65 minutes'
  );
$$;

-- INSERT: dueño + miembro de la liga + ventana abierta
drop policy if exists "predictions_insert" on public.predictions;
create policy "predictions_insert" on public.predictions
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.league_members lm
      where lm.league_id = predictions.league_id and lm.user_id = auth.uid()
    )
    and public.prediction_window_open(match_id)
  );

-- UPDATE: dueño + ventana abierta (with check evita "editar tarde")
drop policy if exists "predictions_update" on public.predictions;
create policy "predictions_update" on public.predictions
  for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and public.prediction_window_open(match_id)
  );

-- Verificación rápida (no falla la migración, solo informa)
do $$
begin
  raise notice '✅ Cierre de predicciones activo: 65 min antes del kickoff';
end $$;

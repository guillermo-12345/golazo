-- =============================================
-- MIGRATION 015 — Cierre de predicciones: 5 minutos antes (antes 65)
-- =============================================
-- Cambia la ventana de predicción de 65 a 5 minutos antes del kickoff.
-- Se puede predecir hasta casi el inicio, pero no con el partido empezado.
-- El valor también vive en src/lib/predictions.ts (PREDICTION_LOCK_MINUTES).

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
      and now() < m.scheduled_at - interval '5 minutes'
  );
$$;

do $$
begin
  raise notice '✅ Predicciones abiertas hasta 5 minutos antes del inicio';
end $$;

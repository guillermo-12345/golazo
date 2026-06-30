-- =============================================
-- MIGRATION 018 — Referencias de slot para auto-armar el cuadro
-- =============================================
-- Guarda en extra_data.bracket {h,a} la referencia de cada slot de
-- eliminatorias, para que el sync resuelva los equipos reales solo:
--   1A=ganador grupo A · 2B=segundo grupo B · 3:CEFHI=mejor tercero de
--   esos grupos · WP73=ganador partido 73 · LP101=perdedor partido 101
-- (la lógica vive en src/lib/bracket-resolve.ts, corre tras cada sync).

create or replace function pg_temp.setref(p_fid int, p_h text, p_a text)
returns void language sql as $$
  update public.matches
  set extra_data = jsonb_set(coalesce(extra_data, '{}'::jsonb), '{bracket}',
    jsonb_build_object('h', p_h, 'a', p_a))
  where api_fixture_id = p_fid;
$$;

select pg_temp.setref(99201,'2A','2B');
select pg_temp.setref(99202,'1E','3:ABCDF');
select pg_temp.setref(99203,'1F','2C');
select pg_temp.setref(99204,'1C','2F');
select pg_temp.setref(99205,'1I','3:CDFGH');
select pg_temp.setref(99206,'2E','2I');
select pg_temp.setref(99207,'1A','3:CEFHI');
select pg_temp.setref(99208,'1L','3:EHIJK');
select pg_temp.setref(99209,'1D','3:BEFIJ');
select pg_temp.setref(99210,'1G','3:AEHIJ');
select pg_temp.setref(99211,'2K','2L');
select pg_temp.setref(99212,'1H','2J');
select pg_temp.setref(99213,'1B','3:EFGIJ');
select pg_temp.setref(99214,'1J','2H');
select pg_temp.setref(99215,'1K','3:DEIJL');
select pg_temp.setref(99216,'2D','2G');
-- Octavos: pares adyacentes del cuadro oficial 2026 (cada octavo une dos
-- 16avos vecinos en el orden del cuadro, no cruza mitades).
select pg_temp.setref(99251,'WP74','WP77');
select pg_temp.setref(99252,'WP73','WP75');
select pg_temp.setref(99253,'WP83','WP84');
select pg_temp.setref(99254,'WP81','WP82');
select pg_temp.setref(99255,'WP76','WP78');
select pg_temp.setref(99256,'WP79','WP80');
select pg_temp.setref(99257,'WP86','WP88');
select pg_temp.setref(99258,'WP85','WP87');
select pg_temp.setref(99271,'WP89','WP90');
select pg_temp.setref(99272,'WP91','WP92');
select pg_temp.setref(99273,'WP93','WP94');
select pg_temp.setref(99274,'WP95','WP96');
select pg_temp.setref(99281,'WP97','WP98');
select pg_temp.setref(99282,'WP99','WP100');
select pg_temp.setref(99290,'LP101','LP102');
select pg_temp.setref(99299,'WP101','WP102');

do $$ begin raise notice '✅ Slot refs del cuadro cargadas'; end $$;

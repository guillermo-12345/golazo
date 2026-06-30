-- =============================================
-- MIGRATION 017 — Cuadro de eliminatorias oficial del Mundial 2026
-- =============================================
-- El seed generaba las llaves con un patrón viejo de 16 grupos (A–P) e
-- incluso caracteres basura por overflow de chr(). El Mundial 2026 tiene
-- 12 grupos (A–L): clasifican los 2 primeros de cada grupo + los 8 mejores
-- terceros. Esta migración reescribe los 32 partidos de eliminación directa
-- con el cuadro oficial 2026 (partidos 73–104), por api_fixture_id, sin
-- borrar filas (preserva los UUID y cualquier predicción).
--
-- R32 (73–88): cruces oficiales. R16 (89–96): ganadores W73vW75, etc.
-- QF/SF/Final: árbol estándar de eliminación simple.
-- Los equipos quedan como etiquetas ("1º Grupo A", "3º (A/B/C/D/F)",
-- "Ganador P73"...) con code TBD hasta que terminen los grupos.

-- ---- Dieciseisavos (Round of 32) ----
update public.matches set home_team='2º Grupo A', away_team='2º Grupo B', home_team_code='TBD', away_team_code='TBD', scheduled_at='2026-06-28T20:00:00+00' where api_fixture_id=99201;
update public.matches set home_team='1º Grupo E', away_team='3º (A/B/C/D/F)', home_team_code='TBD', away_team_code='TBD', scheduled_at='2026-06-29T16:00:00+00' where api_fixture_id=99202;
update public.matches set home_team='1º Grupo F', away_team='2º Grupo C', home_team_code='TBD', away_team_code='TBD', scheduled_at='2026-06-29T20:00:00+00' where api_fixture_id=99203;
update public.matches set home_team='1º Grupo C', away_team='2º Grupo F', home_team_code='TBD', away_team_code='TBD', scheduled_at='2026-06-29T23:00:00+00' where api_fixture_id=99204;
update public.matches set home_team='1º Grupo I', away_team='3º (C/D/F/G/H)', home_team_code='TBD', away_team_code='TBD', scheduled_at='2026-06-30T16:00:00+00' where api_fixture_id=99205;
update public.matches set home_team='2º Grupo E', away_team='2º Grupo I', home_team_code='TBD', away_team_code='TBD', scheduled_at='2026-06-30T20:00:00+00' where api_fixture_id=99206;
update public.matches set home_team='1º Grupo A', away_team='3º (C/E/F/H/I)', home_team_code='TBD', away_team_code='TBD', scheduled_at='2026-06-30T23:00:00+00' where api_fixture_id=99207;
update public.matches set home_team='1º Grupo L', away_team='3º (E/H/I/J/K)', home_team_code='TBD', away_team_code='TBD', scheduled_at='2026-07-01T16:00:00+00' where api_fixture_id=99208;
update public.matches set home_team='1º Grupo D', away_team='3º (B/E/F/I/J)', home_team_code='TBD', away_team_code='TBD', scheduled_at='2026-07-01T20:00:00+00' where api_fixture_id=99209;
update public.matches set home_team='1º Grupo G', away_team='3º (A/E/H/I/J)', home_team_code='TBD', away_team_code='TBD', scheduled_at='2026-07-01T23:00:00+00' where api_fixture_id=99210;
update public.matches set home_team='2º Grupo K', away_team='2º Grupo L', home_team_code='TBD', away_team_code='TBD', scheduled_at='2026-07-02T16:00:00+00' where api_fixture_id=99211;
update public.matches set home_team='1º Grupo H', away_team='2º Grupo J', home_team_code='TBD', away_team_code='TBD', scheduled_at='2026-07-02T20:00:00+00' where api_fixture_id=99212;
update public.matches set home_team='1º Grupo B', away_team='3º (E/F/G/I/J)', home_team_code='TBD', away_team_code='TBD', scheduled_at='2026-07-02T23:00:00+00' where api_fixture_id=99213;
update public.matches set home_team='1º Grupo J', away_team='2º Grupo H', home_team_code='TBD', away_team_code='TBD', scheduled_at='2026-07-03T16:00:00+00' where api_fixture_id=99214;
update public.matches set home_team='1º Grupo K', away_team='3º (D/E/I/J/L)', home_team_code='TBD', away_team_code='TBD', scheduled_at='2026-07-03T20:00:00+00' where api_fixture_id=99215;
update public.matches set home_team='2º Grupo D', away_team='2º Grupo G', home_team_code='TBD', away_team_code='TBD', scheduled_at='2026-07-03T23:00:00+00' where api_fixture_id=99216;

-- ---- Octavos (Round of 16) — ganadores de R32 ----
update public.matches set home_team='Ganador P74', away_team='Ganador P77', home_team_code='TBD', away_team_code='TBD', scheduled_at='2026-07-04T20:00:00+00' where api_fixture_id=99251;
update public.matches set home_team='Ganador P73', away_team='Ganador P75', home_team_code='TBD', away_team_code='TBD', scheduled_at='2026-07-04T23:00:00+00' where api_fixture_id=99252;
update public.matches set home_team='Ganador P83', away_team='Ganador P84', home_team_code='TBD', away_team_code='TBD', scheduled_at='2026-07-05T20:00:00+00' where api_fixture_id=99253;
update public.matches set home_team='Ganador P81', away_team='Ganador P82', home_team_code='TBD', away_team_code='TBD', scheduled_at='2026-07-05T23:00:00+00' where api_fixture_id=99254;
update public.matches set home_team='Ganador P76', away_team='Ganador P78', home_team_code='TBD', away_team_code='TBD', scheduled_at='2026-07-06T20:00:00+00' where api_fixture_id=99255;
update public.matches set home_team='Ganador P79', away_team='Ganador P80', home_team_code='TBD', away_team_code='TBD', scheduled_at='2026-07-06T23:00:00+00' where api_fixture_id=99256;
update public.matches set home_team='Ganador P86', away_team='Ganador P88', home_team_code='TBD', away_team_code='TBD', scheduled_at='2026-07-07T20:00:00+00' where api_fixture_id=99257;
update public.matches set home_team='Ganador P85', away_team='Ganador P87', home_team_code='TBD', away_team_code='TBD', scheduled_at='2026-07-07T23:00:00+00' where api_fixture_id=99258;

-- ---- Cuartos ----
update public.matches set home_team='Ganador P89', away_team='Ganador P90', home_team_code='TBD', away_team_code='TBD', scheduled_at='2026-07-09T20:00:00+00' where api_fixture_id=99271;
update public.matches set home_team='Ganador P91', away_team='Ganador P92', home_team_code='TBD', away_team_code='TBD', scheduled_at='2026-07-10T20:00:00+00' where api_fixture_id=99272;
update public.matches set home_team='Ganador P93', away_team='Ganador P94', home_team_code='TBD', away_team_code='TBD', scheduled_at='2026-07-11T16:00:00+00' where api_fixture_id=99273;
update public.matches set home_team='Ganador P95', away_team='Ganador P96', home_team_code='TBD', away_team_code='TBD', scheduled_at='2026-07-11T20:00:00+00' where api_fixture_id=99274;

-- ---- Semifinales ----
update public.matches set home_team='Ganador P97', away_team='Ganador P98', home_team_code='TBD', away_team_code='TBD', scheduled_at='2026-07-14T19:00:00+00' where api_fixture_id=99281;
update public.matches set home_team='Ganador P99', away_team='Ganador P100', home_team_code='TBD', away_team_code='TBD', scheduled_at='2026-07-15T19:00:00+00' where api_fixture_id=99282;

-- ---- Tercer puesto y Final ----
update public.matches set home_team='Perdedor P101', away_team='Perdedor P102', home_team_code='TBD', away_team_code='TBD', scheduled_at='2026-07-18T19:00:00+00' where api_fixture_id=99290;
update public.matches set home_team='Ganador P101', away_team='Ganador P102', home_team_code='TBD', away_team_code='TBD', scheduled_at='2026-07-19T19:00:00+00' where api_fixture_id=99299;

do $$
begin
  raise notice '✅ Cuadro de eliminatorias 2026 cargado (16avos a la final)';
end $$;

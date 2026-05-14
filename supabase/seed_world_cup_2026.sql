-- =============================================
-- SEED: Mundial 2026 — 48 equipos, 12 grupos, 104 partidos
-- =============================================
-- 48 selecciones clasificadas (mejor estimación previo al sorteo oficial).
-- Las fechas son del calendario oficial de FIFA (11 junio - 19 julio 2026).
-- IDs de fixture: 99100-99299 (rango propio para no chocar con API-Football).
--
-- Para ejecutar: Supabase > SQL Editor > pegar todo > Run.
-- Idempotente: borra las filas previas del seed antes de re-insertar.
-- =============================================

-- Limpiar seed anterior (cascada: tambien borra predicciones de prueba sobre esos partidos)
delete from public.matches where api_fixture_id between 99100 and 99299;

do $$
declare
  -- 12 grupos x 4 equipos = 48 selecciones
  groups jsonb := '[
    {"letter":"A","venue":"Estadio Azteca, Ciudad de México","teams":[
      ["México","MEX"],["Croacia","CRO"],["Camerún","CMR"],["Arabia Saudita","KSA"]
    ]},
    {"letter":"B","venue":"BMO Field, Toronto","teams":[
      ["Canadá","CAN"],["Marruecos","MAR"],["Noruega","NOR"],["Ecuador","ECU"]
    ]},
    {"letter":"C","venue":"MetLife Stadium, Nueva Jersey","teams":[
      ["Estados Unidos","USA"],["Irán","IRN"],["Egipto","EGY"],["Paraguay","PAR"]
    ]},
    {"letter":"D","venue":"SoFi Stadium, Los Ángeles","teams":[
      ["Argentina","ARG"],["Senegal","SEN"],["Austria","AUT"],["Nueva Zelanda","NZL"]
    ]},
    {"letter":"E","venue":"Mercedes-Benz Stadium, Atlanta","teams":[
      ["Francia","FRA"],["Italia","ITA"],["Argelia","ALG"],["Iraq","IRQ"]
    ]},
    {"letter":"F","venue":"Levi''s Stadium, San Francisco","teams":[
      ["España","ESP"],["Japón","JPN"],["Turquía","TUR"],["Costa Rica","CRC"]
    ]},
    {"letter":"G","venue":"AT&T Stadium, Dallas","teams":[
      ["Inglaterra","ENG"],["Colombia","COL"],["Ghana","GHA"],["Uzbekistán","UZB"]
    ]},
    {"letter":"H","venue":"NRG Stadium, Houston","teams":[
      ["Brasil","BRA"],["Suiza","SUI"],["Polonia","POL"],["Jordania","JOR"]
    ]},
    {"letter":"I","venue":"Arrowhead Stadium, Kansas City","teams":[
      ["Portugal","POR"],["Corea del Sur","KOR"],["Chequia","CZE"],["Panamá","PAN"]
    ]},
    {"letter":"J","venue":"Lincoln Financial Field, Filadelfia","teams":[
      ["Países Bajos","NED"],["Uruguay","URU"],["Túnez","TUN"],["Honduras","HON"]
    ]},
    {"letter":"K","venue":"Hard Rock Stadium, Miami","teams":[
      ["Bélgica","BEL"],["Australia","AUS"],["Costa de Marfil","CIV"],["Venezuela","VEN"]
    ]},
    {"letter":"L","venue":"Estadio Akron, Guadalajara","teams":[
      ["Alemania","GER"],["Dinamarca","DEN"],["Nigeria","NGA"],["RD del Congo","COD"]
    ]}
  ]'::jsonb;

  -- Cada grupo juega 6 partidos (round-robin entre 4 equipos)
  -- Orden por fechas: J1 vs J2, J3 vs J4 (fecha 1); J1 vs J3, J2 vs J4 (fecha 2); J1 vs J4, J2 vs J3 (fecha 3)
  matchups int[][] := array[[1,2],[3,4],[1,3],[2,4],[1,4],[2,3]];

  g jsonb;
  teams jsonb;
  group_idx int := 0;
  m int;
  i int;
  j int;
  fixture_id int := 99100;
  match_count int := 0;

  -- Fechas: fase de grupos del 11 al 27 de junio 2026 (calendario FIFA oficial)
  base_date timestamptz := '2026-06-11 17:00:00+00';
  match_time timestamptz;
  day_offset int;
  hour_offset int;
begin
  for g in select * from jsonb_array_elements(groups) loop
    group_idx := group_idx + 1;
    teams := g->'teams';

    for m in 1..6 loop
      i := matchups[m][1];
      j := matchups[m][2];

      -- Distribucion de fechas (replica del calendario FIFA):
      -- Fecha 1 (m=1,2): dias 0-5 (11-16 junio) -- 2 partidos por dia, 12 grupos en 6 dias
      -- Fecha 2 (m=3,4): dias 6-11 (17-22 junio)
      -- Fecha 3 (m=5,6): dias 12-16 (23-27 junio)
      day_offset := ((m-1)/2) * 6 + ((group_idx-1)/2);
      hour_offset := (((group_idx-1) % 2) * 2 + ((m-1) % 2)) * 3;

      match_time := base_date
                  + (day_offset || ' days')::interval
                  + (hour_offset || ' hours')::interval;

      insert into public.matches (
        api_fixture_id,
        home_team, home_team_code, home_team_logo,
        away_team, away_team_code, away_team_logo,
        scheduled_at, status, stage, group_name, venue
      ) values (
        fixture_id + match_count,
        teams->(i-1)->>0,
        teams->(i-1)->>1,
        '',
        teams->(j-1)->>0,
        teams->(j-1)->>1,
        '',
        match_time,
        'scheduled',
        'group_stage',
        g->>'letter',
        g->>'venue'
      );

      match_count := match_count + 1;
    end loop;
  end loop;
end $$;

-- =============================================
-- Eliminatorias con equipos TBD (se completan al terminar la fase de grupos)
-- =============================================

-- Round of 32: 16 partidos del 28 junio al 3 julio
insert into public.matches (api_fixture_id, home_team, home_team_code, home_team_logo, away_team, away_team_code, away_team_logo, scheduled_at, status, stage, group_name, venue)
select
  99200 + n,
  '1° Grupo ' || chr(64+((n*2-1)::int)), 'TBD',
  '',
  '2° Grupo ' || chr(64+((n*2)::int)), 'TBD',
  '',
  ('2026-06-28 17:00:00+00'::timestamptz + ((n-1)/2 || ' days')::interval + ((n-1) % 2 * 4 || ' hours')::interval),
  'scheduled',
  'round_of_32',
  null,
  'Sede a definir'
from generate_series(1, 16) n;

-- Round of 16: 8 partidos del 4 al 7 julio
insert into public.matches (api_fixture_id, home_team, home_team_code, home_team_logo, away_team, away_team_code, away_team_logo, scheduled_at, status, stage, group_name, venue)
select
  99250 + n,
  'Ganador R32 ' || n, 'TBD',
  '',
  'Ganador R32 ' || (n+8), 'TBD',
  '',
  ('2026-07-04 17:00:00+00'::timestamptz + ((n-1)/2 || ' days')::interval + ((n-1) % 2 * 4 || ' hours')::interval),
  'scheduled',
  'round_of_16',
  null,
  'Sede a definir'
from generate_series(1, 8) n;

-- Cuartos: 4 partidos del 9 al 11 julio
insert into public.matches (api_fixture_id, home_team, home_team_code, home_team_logo, away_team, away_team_code, away_team_logo, scheduled_at, status, stage, group_name, venue)
select
  99270 + n,
  'Ganador R16 ' || n, 'TBD',
  '',
  'Ganador R16 ' || (n+4), 'TBD',
  '',
  ('2026-07-09 17:00:00+00'::timestamptz + ((n-1)/2 || ' days')::interval + ((n-1) % 2 * 4 || ' hours')::interval),
  'scheduled',
  'quarter_final',
  null,
  'Sede a definir'
from generate_series(1, 4) n;

-- Semifinales: 14 y 15 julio
insert into public.matches (api_fixture_id, home_team, home_team_code, home_team_logo, away_team, away_team_code, away_team_logo, scheduled_at, status, stage, group_name, venue) values
(99281, 'Ganador QF 1', 'TBD', '', 'Ganador QF 2', 'TBD', '', '2026-07-14 19:00:00+00', 'scheduled', 'semi_final', null, 'AT&T Stadium, Dallas'),
(99282, 'Ganador QF 3', 'TBD', '', 'Ganador QF 4', 'TBD', '', '2026-07-15 19:00:00+00', 'scheduled', 'semi_final', null, 'Mercedes-Benz Stadium, Atlanta');

-- Tercer puesto: 18 julio
insert into public.matches (api_fixture_id, home_team, home_team_code, home_team_logo, away_team, away_team_code, away_team_logo, scheduled_at, status, stage, group_name, venue) values
(99290, 'Perdedor SF 1', 'TBD', '', 'Perdedor SF 2', 'TBD', '', '2026-07-18 19:00:00+00', 'scheduled', 'third_place', null, 'Hard Rock Stadium, Miami');

-- Final: 19 julio en MetLife Stadium (New Jersey)
insert into public.matches (api_fixture_id, home_team, home_team_code, home_team_logo, away_team, away_team_code, away_team_logo, scheduled_at, status, stage, group_name, venue) values
(99299, 'Ganador SF 1', 'TBD', '', 'Ganador SF 2', 'TBD', '', '2026-07-19 19:00:00+00', 'scheduled', 'final', null, 'MetLife Stadium, Nueva Jersey');

-- =============================================
-- Verificacion
-- =============================================
do $$
declare
  total_matches int;
  group_matches int;
  knockout_matches int;
begin
  select count(*) into total_matches from public.matches where api_fixture_id between 99100 and 99299;
  select count(*) into group_matches from public.matches where stage = 'group_stage';
  select count(*) into knockout_matches from public.matches where api_fixture_id between 99200 and 99299;

  raise notice '✅ Mundial 2026 cargado: % partidos totales (% fase grupos, % eliminacion)',
    total_matches, group_matches, knockout_matches;
end $$;

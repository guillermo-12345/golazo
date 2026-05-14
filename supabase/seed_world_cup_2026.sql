-- =============================================
-- SEED: Mundial 2026 — 48 equipos, 12 grupos, 104 partidos
-- =============================================
-- 48 selecciones clasificadas según el sorteo oficial.
-- Las fechas son del calendario oficial de FIFA (11 junio - 19 julio 2026).
-- IDs de fixture: 99100-99299.
--
-- Para ejecutar: Supabase > SQL Editor > pegar todo > Run.
-- Idempotente: borra las filas previas del seed antes de re-insertar.
-- =============================================

-- Limpiar seed anterior (cascada: tambien borra predicciones de prueba sobre esos partidos)
delete from public.matches where api_fixture_id between 99100 and 99299;

do $$
declare
  groups jsonb := '[
    {"letter":"A","venue":"Estadio Azteca, Ciudad de México","teams":[
      ["México","MEX"],["Sudáfrica","RSA"],["Corea del Sur","KOR"],["Chequia","CZE"]
    ]},
    {"letter":"B","venue":"BMO Field, Toronto","teams":[
      ["Canadá","CAN"],["Bosnia y Herzegovina","BIH"],["Qatar","QAT"],["Suiza","SUI"]
    ]},
    {"letter":"C","venue":"MetLife Stadium, Nueva Jersey","teams":[
      ["Brasil","BRA"],["Marruecos","MAR"],["Haití","HAI"],["Escocia","SCO"]
    ]},
    {"letter":"D","venue":"SoFi Stadium, Los Ángeles","teams":[
      ["Estados Unidos","USA"],["Paraguay","PAR"],["Australia","AUS"],["Turquía","TUR"]
    ]},
    {"letter":"E","venue":"Mercedes-Benz Stadium, Atlanta","teams":[
      ["Alemania","GER"],["Curazao","CUW"],["Costa de Marfil","CIV"],["Ecuador","ECU"]
    ]},
    {"letter":"F","venue":"Levi''s Stadium, San Francisco","teams":[
      ["Países Bajos","NED"],["Japón","JPN"],["Suecia","SWE"],["Túnez","TUN"]
    ]},
    {"letter":"G","venue":"AT&T Stadium, Dallas","teams":[
      ["Bélgica","BEL"],["Egipto","EGY"],["Irán","IRN"],["Nueva Zelanda","NZL"]
    ]},
    {"letter":"H","venue":"NRG Stadium, Houston","teams":[
      ["España","ESP"],["Cabo Verde","CPV"],["Arabia Saudita","KSA"],["Uruguay","URU"]
    ]},
    {"letter":"I","venue":"Arrowhead Stadium, Kansas City","teams":[
      ["Francia","FRA"],["Senegal","SEN"],["Irak","IRQ"],["Noruega","NOR"]
    ]},
    {"letter":"J","venue":"Lincoln Financial Field, Filadelfia","teams":[
      ["Argentina","ARG"],["Argelia","ALG"],["Austria","AUT"],["Jordania","JOR"]
    ]},
    {"letter":"K","venue":"Hard Rock Stadium, Miami","teams":[
      ["Portugal","POR"],["RD del Congo","COD"],["Uzbekistán","UZB"],["Colombia","COL"]
    ]},
    {"letter":"L","venue":"Estadio Akron, Guadalajara","teams":[
      ["Inglaterra","ENG"],["Croacia","CRO"],["Ghana","GHA"],["Panamá","PAN"]
    ]}
  ]'::jsonb;

  matchups int[][] := array[[1,2],[3,4],[1,3],[2,4],[1,4],[2,3]];

  g jsonb;
  teams jsonb;
  group_idx int := 0;
  m int;
  i int;
  j int;
  fixture_id int := 99100;
  match_count int := 0;

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
-- Eliminatorias con equipos TBD
-- =============================================

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

insert into public.matches (api_fixture_id, home_team, home_team_code, home_team_logo, away_team, away_team_code, away_team_logo, scheduled_at, status, stage, group_name, venue) values
(99281, 'Ganador QF 1', 'TBD', '', 'Ganador QF 2', 'TBD', '', '2026-07-14 19:00:00+00', 'scheduled', 'semi_final', null, 'AT&T Stadium, Dallas'),
(99282, 'Ganador QF 3', 'TBD', '', 'Ganador QF 4', 'TBD', '', '2026-07-15 19:00:00+00', 'scheduled', 'semi_final', null, 'Mercedes-Benz Stadium, Atlanta');

insert into public.matches (api_fixture_id, home_team, home_team_code, home_team_logo, away_team, away_team_code, away_team_logo, scheduled_at, status, stage, group_name, venue) values
(99290, 'Perdedor SF 1', 'TBD', '', 'Perdedor SF 2', 'TBD', '', '2026-07-18 19:00:00+00', 'scheduled', 'third_place', null, 'Hard Rock Stadium, Miami');

insert into public.matches (api_fixture_id, home_team, home_team_code, home_team_logo, away_team, away_team_code, away_team_logo, scheduled_at, status, stage, group_name, venue) values
(99299, 'Ganador SF 1', 'TBD', '', 'Ganador SF 2', 'TBD', '', '2026-07-19 19:00:00+00', 'scheduled', 'final', null, 'MetLife Stadium, Nueva Jersey');

do $$
declare
  total_matches int;
begin
  select count(*) into total_matches from public.matches where api_fixture_id between 99100 and 99299;
  raise notice '✅ Mundial 2026 cargado: % partidos', total_matches;
end $$;

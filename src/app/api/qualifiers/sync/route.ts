import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import {
  getQualifierFixtures,
  getQualifierLeagueConfigs,
  mapFixtureStatus,
  type APIFixture,
} from "@/lib/api-football/client"
import { resolveApiTeamCode } from "@/lib/teams"

/**
 * Sincronización de partidos de Eliminatorias (Preeliminares) al Mundial 2026.
 *
 *  - POST /api/qualifiers/sync          → sync de todas las ligas configuradas
 *  - POST /api/qualifiers/sync?dry=1    → no escribe, devuelve resumen para verificar
 *
 * Auth: header `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`
 *
 * Si `API_FOOTBALL_QUALIFIER_LEAGUES` no está configurada, no trae nada
 * (cero datos erróneos por defecto). Los IDs de liga deben verificarse en
 * el dashboard de API-Football antes de sincronizar.
 */

export const dynamic = "force-dynamic"
export const maxDuration = 60

function deriveConfederation(leagueName: string): string {
  const n = leagueName.toLowerCase()
  if (n.includes("uefa") || n.includes("europe")) return "UEFA"
  if (n.includes("conmebol") || n.includes("south america")) return "CONMEBOL"
  if (n.includes("concacaf") || n.includes("north")) return "CONCACAF"
  if (n.includes("caf") || n.includes("africa")) return "CAF"
  if (n.includes("afc") || n.includes("asia")) return "AFC"
  if (n.includes("ofc") || n.includes("oceania")) return "OFC"
  if (n.includes("play-off") || n.includes("playoff") || n.includes("intercontinental"))
    return "PLAYOFF"
  return "OTHER"
}

function buildRows(fixtures: APIFixture[]) {
  return fixtures.map((f) => ({
    api_fixture_id: f.fixture.id,
    confederation: deriveConfederation(f.league.name ?? ""),
    league_round: f.league.round ?? null,
    home_team: f.teams.home.name,
    away_team: f.teams.away.name,
    home_team_logo: f.teams.home.logo ?? null,
    away_team_logo: f.teams.away.logo ?? null,
    home_team_code: resolveApiTeamCode(f.teams.home.name),
    away_team_code: resolveApiTeamCode(f.teams.away.name),
    scheduled_at: f.fixture.date,
    status: mapFixtureStatus(f.fixture.status.short),
    home_score: f.goals.home,
    away_score: f.goals.away,
    venue: f.fixture.venue?.name ?? null,
    extra_data: { halftime: f.score.halftime, fulltime: f.score.fulltime },
    synced_at: new Date().toISOString(),
  }))
}

async function authorize(request: Request): Promise<boolean> {
  const auth = request.headers.get("authorization")
  return auth === `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
}

export async function POST(request: Request) {
  if (!(await authorize(request))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const dry = url.searchParams.get("dry") === "1"

  const configs = getQualifierLeagueConfigs()
  if (configs.length === 0) {
    return Response.json({
      ok: true,
      configured: false,
      message:
        "API_FOOTBALL_QUALIFIER_LEAGUES no está configurada. No se sincronizó nada (evita datos erróneos). Configurá los IDs de liga verificados en API-Football.",
      synced: 0,
    })
  }

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const perLeague: Array<{ league: number; season: number; received: number }> = []
    let allRows: ReturnType<typeof buildRows> = []

    for (const cfg of configs) {
      const fixtures = await getQualifierFixtures(cfg.league, cfg.season)
      const rows = buildRows(fixtures)
      perLeague.push({ league: cfg.league, season: cfg.season, received: rows.length })
      allRows = allRows.concat(rows)
    }

    if (!dry && allRows.length > 0) {
      const { error } = await supabase
        .from("qualifier_matches")
        .upsert(allRows, { onConflict: "api_fixture_id" })
      if (error) throw error
    }

    const matched = allRows.filter(
      (r) => r.home_team_code !== null || r.away_team_code !== null
    ).length

    return Response.json({
      ok: true,
      configured: true,
      dry,
      leagues: perLeague,
      received: allRows.length,
      synced: dry ? 0 : allRows.length,
      withWorldCupTeam: matched,
      sample: dry
        ? allRows.slice(0, 5).map((r) => ({
            home: r.home_team,
            away: r.away_team,
            codes: `${r.home_team_code ?? "?"} vs ${r.away_team_code ?? "?"}`,
            score:
              r.status === "finished" ? `${r.home_score}-${r.away_score}` : null,
            conf: r.confederation,
            date: r.scheduled_at,
          }))
        : undefined,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("qualifiers sync error", msg)
    return Response.json({ error: "Sync failed", detail: msg }, { status: 500 })
  }
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "Use POST" }, { status: 405 })
  }
  return POST(request)
}

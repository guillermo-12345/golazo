import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import {
  getFixtures,
  getLiveFixtures,
  getFixtureEvents,
  getFixtureStatistics,
  mapFixtureStatus,
  type APIFixture,
} from "@/lib/api-football/client"

/**
 * Endpoint de sincronización con API-Football.
 *
 * Modos:
 *  - POST /api/matches/sync           → sync completo (todos los partidos del torneo)
 *  - POST /api/matches/sync?live=1    → solo partidos en vivo (mucho más liviano, llamar cada 1-2 min)
 *
 * Auth: header `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>` o
 *       en cron de Vercel via `Authorization: Bearer <CRON_SECRET>` (usa el service role como cron secret).
 */

export const dynamic = "force-dynamic"
export const maxDuration = 60

async function buildRows(fixtures: APIFixture[], fetchDetails = false) {
  return Promise.all(
    fixtures.map(async (f) => {
      const status = mapFixtureStatus(f.fixture.status.short)
      const extraData: Record<string, unknown> = {
        halftime: f.score.halftime,
        fulltime: f.score.fulltime,
      }

      // Para partidos terminados, traemos events + statistics
      if (fetchDetails && status === "finished") {
        try {
          const [events, statistics] = await Promise.all([
            getFixtureEvents(f.fixture.id),
            getFixtureStatistics(f.fixture.id),
          ])
          extraData.events = events
          extraData.statistics = statistics

          // Calcular datos derivados utiles para scoring de avanzadas
          const goals = events.filter((e) => e.type === "Goal" && !e.detail.includes("cancelled"))
          const firstGoal = goals[0]
          if (firstGoal) {
            extraData.firstScorer = firstGoal.player?.name ?? null
            extraData.firstScorerTeam = firstGoal.team.name
            extraData.firstGoalMinute = firstGoal.time.elapsed
            extraData.firstTeamToScore =
              firstGoal.team.name === f.teams.home.name ? "home" : "away"
          }

          // Stats agregadas por equipo
          const homeStats = statistics.find((s) => s.team.name === f.teams.home.name)
          const awayStats = statistics.find((s) => s.team.name === f.teams.away.name)
          if (homeStats || awayStats) {
            const getStat = (s: typeof homeStats, type: string) =>
              s?.statistics.find((st) => st.type === type)?.value
            extraData.corners = {
              home: getStat(homeStats, "Corner Kicks") ?? 0,
              away: getStat(awayStats, "Corner Kicks") ?? 0,
            }
            extraData.yellowCards = {
              home: getStat(homeStats, "Yellow Cards") ?? 0,
              away: getStat(awayStats, "Yellow Cards") ?? 0,
            }
            extraData.redCards = {
              home: getStat(homeStats, "Red Cards") ?? 0,
              away: getStat(awayStats, "Red Cards") ?? 0,
            }
            extraData.possession = {
              home: getStat(homeStats, "Ball Possession") ?? null,
              away: getStat(awayStats, "Ball Possession") ?? null,
            }
          }
        } catch (err) {
          console.error("Error fetching details for fixture", f.fixture.id, err)
        }
      }

      return {
        api_fixture_id: f.fixture.id,
        home_team: f.teams.home.name,
        away_team: f.teams.away.name,
        home_team_logo: f.teams.home.logo,
        away_team_logo: f.teams.away.logo,
        home_team_code: f.teams.home.name.slice(0, 3).toUpperCase(),
        away_team_code: f.teams.away.name.slice(0, 3).toUpperCase(),
        scheduled_at: f.fixture.date,
        status,
        home_score: f.goals.home,
        away_score: f.goals.away,
        stage: f.league.round,
        venue: f.fixture.venue.name,
        minute: f.fixture.status.elapsed,
        extra_data: extraData,
      }
    })
  )
}

async function authorize(request: Request): Promise<boolean> {
  const auth = request.headers.get("authorization")
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  return auth === `Bearer ${serviceKey}`
}

export async function POST(request: Request) {
  if (!(await authorize(request))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const liveOnly = url.searchParams.get("live") === "1"
  const dry = url.searchParams.get("dry") === "1"
  const seasonParam = url.searchParams.get("season")
  const seasonOverride = seasonParam ? parseInt(seasonParam) : undefined
  const source = liveOnly ? "live" : dry ? "dry-run" : "full"

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Log inicio
  const { data: logEntry } = await supabase
    .from("sync_log")
    .insert({ source })
    .select("id")
    .single()
  const logId = (logEntry as { id: string } | null)?.id

  try {
    const fixtures = liveOnly ? await getLiveFixtures() : await getFixtures(seasonOverride)
    // fetchDetails=true para sync completo: trae events + stats de partidos terminados
    const rows = await buildRows(fixtures, !liveOnly)
    const finishedCount = rows.filter((r) => r.status === "finished").length

    // En modo dry-run NO escribimos a la DB, solo devolvemos el resumen
    if (!dry && rows.length > 0) {
      const { error } = await supabase
        .from("matches")
        .upsert(rows, { onConflict: "api_fixture_id" })
      if (error) throw error
    }

    // Actualizar log con éxito
    if (logId) {
      await supabase
        .from("sync_log")
        .update({
          finished_at: new Date().toISOString(),
          matches_synced: dry ? 0 : rows.length,
          matches_finished: finishedCount,
        })
        .eq("id", logId)
    }

    return Response.json({
      ok: true,
      source,
      dry,
      season: seasonOverride ?? undefined,
      received: rows.length,
      synced: dry ? 0 : rows.length,
      finished: finishedCount,
      sample: dry && rows.length > 0 ? rows.slice(0, 3).map((r) => ({
        home: r.home_team,
        away: r.away_team,
        score: r.status === "finished" ? `${r.home_score}-${r.away_score}` : null,
        date: r.scheduled_at,
        stage: r.stage,
      })) : undefined,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("sync error", msg)

    if (logId) {
      await supabase
        .from("sync_log")
        .update({ finished_at: new Date().toISOString(), error: msg })
        .eq("id", logId)
    }

    return Response.json({ error: "Sync failed", detail: msg }, { status: 500 })
  }
}

// GET para testing manual desde el browser (solo en desarrollo)
export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "Use POST" }, { status: 405 })
  }
  return POST(request)
}

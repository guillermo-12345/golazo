import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import {
  getEspnEventsForDate,
  getEspnMatchDetails,
  dateRange,
  type EspnEvent,
  type EspnMatchDetails,
  type EspnTeamStats,
} from "@/lib/espn/client"
import { computeBracketUpdates, type BracketMatch } from "@/lib/bracket-resolve"

/**
 * Sincronización de calendario y marcadores desde la API pública de ESPN.
 * Fuente puente mientras API-Football (plan free) no tenga la temporada 2026.
 *
 * Modos:
 *  - POST /api/matches/sync-espn          → ventana corta: ayer, hoy y mañana (para crons)
 *  - POST /api/matches/sync-espn?full=1   → toda la fase de grupos (11-27 jun)
 *  - POST /api/matches/sync-espn?dry=1    → no escribe, devuelve qué cambiaría
 *
 * Por cada partido de grupos en la DB busca el evento real por par de equipos:
 *  - corrige scheduled_at y venue al calendario real
 *  - si está en vivo: status='live' + marcador + minuto
 *  - si terminó: status='finished' + marcador (el trigger recalcula puntos)
 *
 * La actualización es orientación-aware: si ESPN lista el partido con
 * local/visitante invertidos respecto de la DB, los goles se intercambian.
 * Los cruces de playoffs (equipos TBD) se ignoran hasta que tengan equipos.
 *
 * Auth: header `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`
 */

export const dynamic = "force-dynamic"
export const maxDuration = 60

const GROUP_STAGE_START = new Date("2026-06-11T00:00:00Z")
const GROUP_STAGE_END = new Date("2026-06-27T23:59:59Z")

type DbMatch = {
  id: string
  home_team: string
  away_team: string
  home_team_code: string
  away_team_code: string
  scheduled_at: string
  venue: string | null
  status: string
  home_score: number | null
  away_score: number | null
  minute: number | null
  extra_data: Record<string, unknown> | null
}

function pairKey(a: string, b: string): string {
  return [a, b].sort().join("|")
}

/**
 * Construye el extra_data que consume el motor de predicciones avanzadas
 * (migración 006/011) y la página del partido (events + statistics estilo
 * API-Football), orientado al local/visitante de NUESTRA base.
 */
function buildExtraData(m: DbMatch, ev: EspnEvent, det: EspnMatchDetails): Record<string, unknown> {
  const flipped = (det.homeCode ?? ev.homeCode) !== m.home_team_code
  const teamName = (code: string | null) =>
    code === m.home_team_code ? m.home_team : code === m.away_team_code ? m.away_team : code ?? ""

  const extra: Record<string, unknown> = {
    fulltime: {
      home: flipped ? ev.awayScore : ev.homeScore,
      away: flipped ? ev.homeScore : ev.awayScore,
    },
  }

  if (det.halftime) {
    extra.halftime = flipped
      ? { home: det.halftime.away, away: det.halftime.home }
      : det.halftime
  }

  if (det.firstScorer) {
    extra.firstScorer = det.firstScorer
    extra.firstScorerTeam = teamName(det.firstScorerTeamCode)
    extra.firstGoalMinute = det.firstGoalMinute
    extra.firstTeamToScore = det.firstScorerTeamCode === m.home_team_code ? "home" : "away"
  }

  if (det.stats) {
    const side = flipped ? { home: det.stats.away, away: det.stats.home } : det.stats
    extra.corners = { home: side.home.corners, away: side.away.corners }
    extra.yellowCards = { home: side.home.yellowCards, away: side.away.yellowCards }
    extra.redCards = { home: side.home.redCards, away: side.away.redCards }
    extra.possession = { home: side.home.possession, away: side.away.possession }
    extra.totalShots = { home: side.home.totalShots, away: side.away.totalShots }
    extra.fouls = { home: side.home.fouls, away: side.away.fouls }

    const statRow = (name: string, s: EspnTeamStats) => ({
      team: { name },
      statistics: [
        { type: "Ball Possession", value: `${s.possession}%` },
        { type: "Total Shots", value: s.totalShots },
        { type: "Shots on Goal", value: s.shotsOnGoal },
        { type: "Corner Kicks", value: s.corners },
        { type: "Fouls", value: s.fouls },
        { type: "Yellow Cards", value: s.yellowCards },
        { type: "Red Cards", value: s.redCards },
        { type: "Offsides", value: s.offsides },
        { type: "Goalkeeper Saves", value: s.saves },
        { type: "Passes %", value: `${s.passPct}%` },
      ],
    })
    extra.statistics = [statRow(m.home_team, side.home), statRow(m.away_team, side.away)]
  }

  if (det.events.length > 0) {
    extra.events = det.events.map((e) => ({
      time: { elapsed: e.minute, extra: e.extra },
      team: { name: teamName(e.teamCode) },
      player: e.player ? { name: e.player } : null,
      type: e.type,
      detail: e.detail,
    }))
  }

  return extra
}

function buildPatch(m: DbMatch, ev: EspnEvent): Record<string, unknown> {
  const patch: Record<string, unknown> = {}

  // Calendario real (comparamos al minuto)
  const evDate = new Date(ev.date).toISOString()
  if (new Date(m.scheduled_at).toISOString() !== evDate) {
    patch.scheduled_at = evDate
  }
  if (ev.venue && ev.venue !== m.venue) {
    patch.venue = ev.venue
  }

  // Marcador con la orientación de la DB
  const flipped = ev.homeCode !== m.home_team_code
  const homeScore = flipped ? ev.awayScore : ev.homeScore
  const awayScore = flipped ? ev.homeScore : ev.awayScore

  if (ev.state === "post" && ev.completed) {
    if (m.status !== "finished" || m.home_score !== homeScore || m.away_score !== awayScore) {
      patch.home_score = homeScore
      patch.away_score = awayScore
      patch.status = "finished"
      patch.minute = 90
    }
  } else if (ev.state === "in") {
    if (
      m.status !== "live" ||
      m.home_score !== homeScore ||
      m.away_score !== awayScore ||
      m.minute !== ev.minute
    ) {
      patch.home_score = homeScore
      patch.away_score = awayScore
      patch.status = "live"
      patch.minute = ev.minute
    }
  }
  // state === "pre": solo calendario; nunca pisamos un resultado cargado a mano

  return patch
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
  const full = url.searchParams.get("full") === "1"

  // Ventana de días a consultar en ESPN (UTC)
  let from: Date
  let to: Date
  if (full) {
    from = GROUP_STAGE_START
    to = GROUP_STAGE_END
  } else {
    const now = new Date()
    from = new Date(now.getTime() - 24 * 3600 * 1000)
    to = new Date(now.getTime() + 24 * 3600 * 1000)
    // Fuera del torneo no hay nada que sincronizar
    if (to < GROUP_STAGE_START || from > new Date("2026-07-20T00:00:00Z")) {
      return Response.json({ ok: true, message: "Fuera de la ventana del torneo", synced: 0 })
    }
  }

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: logEntry } = await supabase
    .from("sync_log")
    .insert({ source: dry ? "espn-dry" : "espn" })
    .select("id")
    .single()
  const logId = (logEntry as { id: string } | null)?.id

  try {
    // 1. Eventos reales de ESPN en la ventana
    const events = new Map<string, EspnEvent>()
    for (const day of dateRange(from, to)) {
      for (const ev of await getEspnEventsForDate(day)) {
        events.set(pairKey(ev.homeCode, ev.awayCode), ev)
      }
    }

    // 2. Todos los partidos: grupos + eliminatorias ya con equipos reales.
    //    Los slots TBD (knockout sin definir) se saltean al matchear.
    const { data: matchesData, error: mErr } = await supabase
      .from("matches")
      .select(
        "id, home_team, away_team, home_team_code, away_team_code, scheduled_at, venue, status, home_score, away_score, minute, extra_data"
      )
    if (mErr) throw mErr

    const matches = (matchesData ?? []) as DbMatch[]

    // 3. Aplicar diferencias
    let updated = 0
    let finished = 0
    let live = 0
    let detailsFetched = 0
    const changes: Array<{ match: string; fields: string[] }> = []

    for (const m of matches) {
      // Slots de knockout sin definir: no se pueden matchear
      if (m.home_team_code === "TBD" || m.away_team_code === "TBD") continue
      const ev = events.get(pairKey(m.home_team_code, m.away_team_code))
      if (!ev) continue

      const patch = buildPatch(m, ev)

      // Detalles (goleador, descanso, tarjetas, stats) para partidos terminados:
      // al momento de terminar van en el MISMO patch que el marcador, así el
      // trigger puntúa las avanzadas con la data ya presente. Para partidos ya
      // terminados sin detalles (backfill) solo se completa extra_data — eso no
      // re-dispara el trigger (el marcador no cambia), o sea sin notifs duplicadas.
      const justFinished = patch.status === "finished"
      const hasDetails = !!m.extra_data?.halftime
      if (ev.completed && (justFinished || !hasDetails)) {
        try {
          const det = await getEspnMatchDetails(ev.eventId)
          patch.extra_data = { ...(m.extra_data ?? {}), ...buildExtraData(m, ev, det) }
          detailsFetched++
        } catch (err) {
          // Sin detalles el marcador igual se aplica; el backfill reintenta solo
          console.error("espn summary error", ev.eventId, err)
        }
      }

      if (Object.keys(patch).length === 0) continue

      if (patch.status === "finished") finished++
      if (patch.status === "live") live++

      if (!dry) {
        const { error } = await supabase.from("matches").update(patch).eq("id", m.id)
        if (error) throw error
      }
      updated++
      changes.push({ match: `${m.home_team} vs ${m.away_team}`, fields: Object.keys(patch) })
    }

    // 4. Auto-armado del cuadro: completa slots de knockout (ganadores/2dos de
    //    grupo, ganadores/perdedores de rondas previas) a medida que se definen.
    let bracketFilled = 0
    const bracketChanges: string[] = []
    if (!dry) {
      const { data: allData, error: bErr } = await supabase
        .from("matches")
        .select(
          "api_fixture_id, stage, status, group_name, home_team, away_team, home_team_code, away_team_code, home_score, away_score, extra_data"
        )
      if (bErr) throw bErr
      const bracketUpdates = computeBracketUpdates((allData ?? []) as BracketMatch[])
      for (const u of bracketUpdates) {
        const { error } = await supabase
          .from("matches")
          .update({
            home_team: u.home_team,
            home_team_code: u.home_team_code,
            away_team: u.away_team,
            away_team_code: u.away_team_code,
          })
          .eq("api_fixture_id", u.api_fixture_id)
        if (error) throw error
        bracketFilled++
        bracketChanges.push(`${u.home_team} vs ${u.away_team}`)
      }
    }

    if (logId) {
      await supabase
        .from("sync_log")
        .update({
          finished_at: new Date().toISOString(),
          matches_synced: dry ? 0 : updated,
          matches_finished: finished,
        })
        .eq("id", logId)
    }

    return Response.json({
      ok: true,
      source: "espn",
      dry,
      window: { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) },
      eventsFound: events.size,
      updated,
      finished,
      live,
      detailsFetched,
      bracketFilled,
      bracketChanges: bracketChanges.slice(0, 12),
      changes: changes.slice(0, 20),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("espn sync error", msg)
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

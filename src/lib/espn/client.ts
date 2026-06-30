/**
 * Cliente de la API pública de ESPN (sin key) para el Mundial 2026.
 *
 * Sirve de fuente de resultados/calendario mientras el plan de API-Football
 * no incluya la temporada 2026. No trae estadísticas finas (córners,
 * posesión, etc.) — para predicciones avanzadas sigue haciendo falta
 * API-Football Pro.
 */

const SCOREBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard"

export type EspnEvent = {
  /** id del evento en ESPN (para pedir el summary con detalles) */
  eventId: string
  homeCode: string
  awayCode: string
  /** ISO UTC del kickoff real */
  date: string
  venue: string | null
  /** pre | in | post */
  state: "pre" | "in" | "post"
  completed: boolean
  homeScore: number
  awayScore: number
  /** Minuto estimado de juego (solo si está en vivo) */
  minute: number | null
  /** Ganador real según ESPN (contempla alargue y penales). null si empate/no def. */
  winner: "home" | "away" | null
  /** Penales (shootout) si se definió por penales; null si no hubo. */
  shootout: { home: number; away: number } | null
  /** Detalle del estado: FT, AET (alargue), Pens, etc. */
  statusDetail: string | null
}

// Nombre ESPN normalizado -> code FIFA de los 48 clasificados.
const NAME_TO_CODE: Record<string, string> = {
  "mexico": "MEX", "south africa": "RSA", "south korea": "KOR", "korea republic": "KOR",
  "czechia": "CZE", "czech republic": "CZE",
  "canada": "CAN", "bosnia herzegovina": "BIH", "bosnia and herzegovina": "BIH",
  "qatar": "QAT", "switzerland": "SUI",
  "brazil": "BRA", "morocco": "MAR", "haiti": "HAI", "scotland": "SCO",
  "united states": "USA", "usa": "USA", "paraguay": "PAR", "australia": "AUS",
  "turkey": "TUR", "turkiye": "TUR",
  "germany": "GER", "curacao": "CUW", "ivory coast": "CIV", "cote divoire": "CIV",
  "ecuador": "ECU",
  "netherlands": "NED", "japan": "JPN", "sweden": "SWE", "tunisia": "TUN",
  "belgium": "BEL", "egypt": "EGY", "iran": "IRN", "new zealand": "NZL",
  "spain": "ESP", "cape verde": "CPV", "cape verde islands": "CPV", "cabo verde": "CPV",
  "saudi arabia": "KSA", "uruguay": "URU",
  "france": "FRA", "senegal": "SEN", "iraq": "IRQ", "norway": "NOR",
  "argentina": "ARG", "algeria": "ALG", "austria": "AUT", "jordan": "JOR",
  "portugal": "POR", "dr congo": "COD", "congo dr": "COD",
  "democratic republic of congo": "COD",
  "uzbekistan": "UZB", "colombia": "COL",
  "england": "ENG", "croatia": "CRO", "ghana": "GHA", "panama": "PAN",
}

/** Quita acentos/guiones y baja a minúsculas para matchear nombres ESPN. */
function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/-/g, " ")
    .replace(/&/g, "and")
    .trim()
}

export function espnNameToCode(name: string): string | null {
  return NAME_TO_CODE[normalizeName(name)] ?? null
}

type EspnScoreboard = {
  events?: Array<{
    id: string
    date: string
    competitions: Array<{
      status: {
        displayClock?: string
        type: { state: string; completed: boolean; detail?: string; shortDetail?: string }
      }
      venue?: { fullName?: string; address?: { city?: string } }
      competitors: Array<{
        homeAway: "home" | "away"
        score?: string
        winner?: boolean
        shootoutScore?: string | number
        team: { displayName: string }
      }>
    }>
  }>
}

/** Minuto de juego desde el displayClock de ESPN ("45:00", "90:00+", ...). */
function parseMinute(clock: string | undefined): number | null {
  if (!clock) return null
  const n = parseInt(clock.split(":")[0] ?? "", 10)
  return Number.isFinite(n) ? n : null
}

/**
 * Trae los partidos del Mundial de un día (UTC, formato YYYYMMDD).
 * Devuelve solo eventos cuyos dos equipos se pudieron mapear a un code FIFA
 * (los cruces de playoffs con equipos TBD quedan afuera solos).
 */
export async function getEspnEventsForDate(yyyymmdd: string): Promise<EspnEvent[]> {
  const res = await fetch(`${SCOREBOARD_URL}?dates=${yyyymmdd}`, {
    // Resultados en vivo: no cachear más de 1 min
    next: { revalidate: 60 },
  })
  if (!res.ok) throw new Error(`ESPN error: ${res.status}`)
  const data = (await res.json()) as EspnScoreboard

  const events: EspnEvent[] = []
  for (const e of data.events ?? []) {
    const comp = e.competitions[0]
    if (!comp) continue
    const home = comp.competitors.find((c) => c.homeAway === "home")
    const away = comp.competitors.find((c) => c.homeAway === "away")
    if (!home || !away) continue

    const homeCode = espnNameToCode(home.team.displayName)
    const awayCode = espnNameToCode(away.team.displayName)
    if (!homeCode || !awayCode) continue

    const venueName = comp.venue?.fullName
    const venueCity = comp.venue?.address?.city
    const state = comp.status.type.state as EspnEvent["state"]

    // Ganador real (alargue/penales): ESPN marca winner=true en el que avanza
    const winner: EspnEvent["winner"] = home.winner ? "home" : away.winner ? "away" : null

    // Penales: shootoutScore presente en ambos cuando se define por penales
    const hShoot = home.shootoutScore
    const aShoot = away.shootoutScore
    const shootout =
      hShoot !== undefined && hShoot !== null && aShoot !== undefined && aShoot !== null
        ? { home: parseInt(String(hShoot), 10) || 0, away: parseInt(String(aShoot), 10) || 0 }
        : null

    events.push({
      eventId: e.id,
      homeCode,
      awayCode,
      date: e.date,
      venue: venueName ? (venueCity ? `${venueName}, ${venueCity}` : venueName) : null,
      state,
      completed: comp.status.type.completed,
      homeScore: parseInt(home.score ?? "0", 10) || 0,
      awayScore: parseInt(away.score ?? "0", 10) || 0,
      minute: state === "in" ? parseMinute(comp.status.displayClock) : null,
      winner,
      shootout,
      statusDetail: comp.status.type.detail ?? comp.status.type.shortDetail ?? null,
    })
  }
  return events
}

// ─────────────────────────────────────────────
// Planteles oficiales (rosters)
// ─────────────────────────────────────────────

export type EspnPlayer = {
  name: string
  number: number | null
  /** Goalkeeper | Defender | Midfielder | Attacker (mapeado de ESPN) */
  position: string | null
}

// ESPN usa "Forward"; nuestra DB agrupa con la convención de API-Football.
const POSITION_MAP: Record<string, string> = {
  Goalkeeper: "Goalkeeper",
  Defender: "Defender",
  Midfielder: "Midfielder",
  Forward: "Attacker",
  Attacker: "Attacker",
}

/**
 * Mapa code FIFA -> id de equipo en ESPN, armado desde los scoreboards de
 * la primera fecha de grupos (11-17 jun: ahí juegan los 48 equipos).
 */
export async function getEspnTeamIdMap(): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  for (const day of dateRange(new Date("2026-06-11"), new Date("2026-06-17"))) {
    const res = await fetch(`${SCOREBOARD_URL}?dates=${day}`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) continue
    const data = (await res.json()) as EspnScoreboard
    for (const e of data.events ?? []) {
      for (const c of e.competitions[0]?.competitors ?? []) {
        const code = espnNameToCode(c.team.displayName)
        const id = parseInt((c.team as { id?: string }).id ?? "", 10)
        if (code && Number.isFinite(id)) map.set(code, id)
      }
    }
  }
  return map
}

type EspnRoster = {
  athletes?: Array<{
    displayName?: string
    fullName?: string
    jersey?: string
    position?: { name?: string }
  }>
}

/** Plantel oficial del Mundial según ESPN (los 26 convocados). */
export async function getEspnRoster(teamId: number): Promise<EspnPlayer[]> {
  const res = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/teams/${teamId}/roster`,
    { next: { revalidate: 3600 } }
  )
  if (!res.ok) throw new Error(`ESPN roster error: ${res.status}`)
  const data = (await res.json()) as EspnRoster

  return (data.athletes ?? [])
    .map((a) => {
      const name = a.displayName ?? a.fullName ?? ""
      const num = parseInt(a.jersey ?? "", 10)
      const rawPos = a.position?.name
      return {
        name,
        number: Number.isFinite(num) ? num : null,
        position: rawPos ? POSITION_MAP[rawPos] ?? rawPos : null,
      }
    })
    .filter((p) => p.name.length > 0)
}

// ─────────────────────────────────────────────
// Detalles del partido (summary): goles, tarjetas, descanso, estadísticas
// ─────────────────────────────────────────────

export type EspnTeamStats = {
  corners: number
  yellowCards: number
  redCards: number
  /** % entero (60.5 → 60) — el motor SQL castea a int */
  possession: number
  totalShots: number
  fouls: number
  shotsOnGoal: number
  saves: number
  offsides: number
  /** % entero de pases acertados */
  passPct: number
  /** Penales pateados por el equipo (para "¿hubo penal?") */
  penaltyShots: number
}

export type EspnKeyEvent = {
  minute: number
  extra: number | null
  teamCode: string | null
  player: string | null
  /** Goal | Card | subst (convención API-Football que ya usa la UI) */
  type: string
  detail: string
}

export type EspnMatchDetails = {
  /** Lado según ESPN — el caller orienta con esto */
  homeCode: string | null
  awayCode: string | null
  halftime: { home: number; away: number } | null
  firstScorer: string | null
  firstScorerTeamCode: string | null
  firstGoalMinute: number | null
  stats: { home: EspnTeamStats; away: EspnTeamStats } | null
  events: EspnKeyEvent[]
}

// type.text de ESPN -> {type, detail} estilo API-Football (lo que espera MatchEvents)
const KEY_EVENT_MAP: Record<string, { type: string; detail: string }> = {
  "Goal": { type: "Goal", detail: "Normal Goal" },
  "Goal - Header": { type: "Goal", detail: "Normal Goal" },
  "Goal - Free Kick": { type: "Goal", detail: "Free Kick Goal" },
  "Goal - Volley": { type: "Goal", detail: "Normal Goal" },
  "Penalty - Scored": { type: "Goal", detail: "Penalty" },
  "Own Goal": { type: "Goal", detail: "Own Goal" },
  "Yellow Card": { type: "Card", detail: "Yellow Card" },
  "Red Card": { type: "Card", detail: "Red Card" },
  "Substitution": { type: "subst", detail: "Substitution" },
}

/** "45'+4'" → {minute:45, extra:4} · "9'" → {minute:9, extra:null} */
function parseClock(display: string | undefined): { minute: number; extra: number | null } | null {
  if (!display) return null
  const m = display.match(/^(\d+)'(?:\+(\d+))?/)
  if (!m) return null
  return { minute: parseInt(m[1], 10), extra: m[2] ? parseInt(m[2], 10) : null }
}

function toNum(v: string | undefined): number {
  const n = parseFloat(v ?? "")
  return Number.isFinite(n) ? n : 0
}

type EspnSummary = {
  header?: {
    competitions?: Array<{
      competitors?: Array<{
        homeAway?: "home" | "away"
        team?: { displayName?: string }
        linescores?: Array<{ displayValue?: string }>
      }>
    }>
  }
  keyEvents?: Array<{
    type?: { text?: string }
    clock?: { displayValue?: string }
    team?: { displayName?: string }
    participants?: Array<{ athlete?: { displayName?: string } }>
  }>
  boxscore?: {
    teams?: Array<{
      team?: { displayName?: string }
      statistics?: Array<{ name?: string; displayValue?: string }>
    }>
  }
}

/**
 * Detalles de un partido terminado/en juego: lo que necesita el motor de
 * predicciones avanzadas (goleador, minuto, descanso, tarjetas, córners,
 * posesión, tiros, faltas) + eventos para la página del partido.
 */
export async function getEspnMatchDetails(eventId: string): Promise<EspnMatchDetails> {
  const res = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=${eventId}`,
    { next: { revalidate: 300 } }
  )
  if (!res.ok) throw new Error(`ESPN summary error: ${res.status}`)
  const data = (await res.json()) as EspnSummary

  // Lados y descanso (primer linescore = primer tiempo)
  const competitors = data.header?.competitions?.[0]?.competitors ?? []
  const homeComp = competitors.find((c) => c.homeAway === "home")
  const awayComp = competitors.find((c) => c.homeAway === "away")
  const homeCode = homeComp?.team?.displayName ? espnNameToCode(homeComp.team.displayName) : null
  const awayCode = awayComp?.team?.displayName ? espnNameToCode(awayComp.team.displayName) : null

  let halftime: EspnMatchDetails["halftime"] = null
  const hHT = homeComp?.linescores?.[0]?.displayValue
  const aHT = awayComp?.linescores?.[0]?.displayValue
  if (hHT !== undefined && aHT !== undefined) {
    halftime = { home: parseInt(hHT, 10) || 0, away: parseInt(aHT, 10) || 0 }
  }

  // Eventos clave (goles, tarjetas, cambios) en orden cronológico
  const events: EspnKeyEvent[] = []
  for (const ke of data.keyEvents ?? []) {
    const mapped = KEY_EVENT_MAP[ke.type?.text ?? ""]
    if (!mapped) continue
    const clock = parseClock(ke.clock?.displayValue)
    if (!clock) continue
    events.push({
      minute: clock.minute,
      extra: clock.extra,
      teamCode: ke.team?.displayName ? espnNameToCode(ke.team.displayName) : null,
      player: ke.participants?.[0]?.athlete?.displayName ?? null,
      type: mapped.type,
      detail: mapped.detail,
    })
  }

  // Primer gol
  const firstGoal = events.find((e) => e.type === "Goal")

  // Estadísticas por equipo (boxscore)
  let stats: EspnMatchDetails["stats"] = null
  const boxTeams = data.boxscore?.teams ?? []
  if (boxTeams.length === 2 && homeCode) {
    const parseTeam = (t: (typeof boxTeams)[number]): EspnTeamStats => {
      const byName: Record<string, string | undefined> = {}
      for (const st of t.statistics ?? []) {
        if (st.name) byName[st.name] = st.displayValue
      }
      return {
        corners: Math.round(toNum(byName.wonCorners)),
        yellowCards: Math.round(toNum(byName.yellowCards)),
        redCards: Math.round(toNum(byName.redCards)),
        possession: Math.round(toNum(byName.possessionPct)),
        totalShots: Math.round(toNum(byName.totalShots)),
        fouls: Math.round(toNum(byName.foulsCommitted)),
        shotsOnGoal: Math.round(toNum(byName.shotsOnTarget)),
        saves: Math.round(toNum(byName.saves)),
        offsides: Math.round(toNum(byName.offsides)),
        passPct: Math.round(toNum(byName.passPct) * 100),
        penaltyShots: Math.round(toNum(byName.penaltyKickShots)),
      }
    }
    const homeBox = boxTeams.find(
      (t) => t.team?.displayName && espnNameToCode(t.team.displayName) === homeCode
    )
    const awayBox = boxTeams.find((t) => t !== homeBox)
    if (homeBox && awayBox) {
      stats = { home: parseTeam(homeBox), away: parseTeam(awayBox) }
    }
  }

  return {
    homeCode,
    awayCode,
    halftime,
    firstScorer: firstGoal?.player ?? null,
    firstScorerTeamCode: firstGoal?.teamCode ?? null,
    firstGoalMinute: firstGoal?.minute ?? null,
    stats,
    events,
  }
}

/** Lista de días UTC (YYYYMMDD) entre dos fechas inclusive. */
export function dateRange(from: Date, to: Date): string[] {
  const days: string[] = []
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()))
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()))
  while (d <= end) {
    days.push(d.toISOString().slice(0, 10).replace(/-/g, ""))
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return days
}

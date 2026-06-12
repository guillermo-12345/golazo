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
    date: string
    competitions: Array<{
      status: {
        displayClock?: string
        type: { state: string; completed: boolean }
      }
      venue?: { fullName?: string; address?: { city?: string } }
      competitors: Array<{
        homeAway: "home" | "away"
        score?: string
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

    events.push({
      homeCode,
      awayCode,
      date: e.date,
      venue: venueName ? (venueCity ? `${venueName}, ${venueCity}` : venueName) : null,
      state,
      completed: comp.status.type.completed,
      homeScore: parseInt(home.score ?? "0", 10) || 0,
      awayScore: parseInt(away.score ?? "0", 10) || 0,
      minute: state === "in" ? parseMinute(comp.status.displayClock) : null,
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

const BASE_URL = "https://v3.football.api-sports.io"
const LEAGUE_ID = parseInt(process.env.API_FOOTBALL_LEAGUE_ID ?? "1")
const DEFAULT_SEASON = parseInt(process.env.API_FOOTBALL_SEASON ?? "2026")

async function apiFetch<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      "x-apisports-key": process.env.API_FOOTBALL_KEY!,
    },
    next: { revalidate: 60 },
  })

  if (!res.ok) throw new Error(`API-Football error: ${res.status}`)
  const data = await res.json()
  return data.response as T
}

export type APIFixture = {
  fixture: {
    id: number
    date: string
    status: { short: string; elapsed: number | null }
    venue: { name: string }
  }
  league: { round: string; name: string }
  teams: {
    home: { id: number; name: string; logo: string; winner: boolean | null }
    away: { id: number; name: string; logo: string; winner: boolean | null }
  }
  goals: { home: number | null; away: number | null }
  score: {
    halftime: { home: number | null; away: number | null }
    fulltime: { home: number | null; away: number | null }
  }
}

export type APITeam = {
  team: { id: number; name: string; code: string; logo: string }
  group: string
}

export async function getFixtures(seasonOverride?: number): Promise<APIFixture[]> {
  const season = seasonOverride ?? DEFAULT_SEASON
  return apiFetch(`/fixtures?league=${LEAGUE_ID}&season=${season}`)
}

export async function getFixtureById(fixtureId: number): Promise<APIFixture[]> {
  return apiFetch(`/fixtures?id=${fixtureId}`)
}

export type APIEvent = {
  time: { elapsed: number; extra: number | null }
  team: { id: number; name: string; logo: string }
  player: { id: number; name: string } | null
  assist: { id: number | null; name: string | null }
  type: string
  detail: string
  comments: string | null
}

export type APIStatistic = {
  team: { id: number; name: string; logo: string }
  statistics: Array<{ type: string; value: string | number | null }>
}

export async function getFixtureEvents(fixtureId: number): Promise<APIEvent[]> {
  return apiFetch(`/fixtures/events?fixture=${fixtureId}`)
}

export async function getFixtureStatistics(fixtureId: number): Promise<APIStatistic[]> {
  return apiFetch(`/fixtures/statistics?fixture=${fixtureId}`)
}

export async function getLiveFixtures(): Promise<APIFixture[]> {
  return apiFetch(`/fixtures?league=${LEAGUE_ID}&season=${DEFAULT_SEASON}&live=all`)
}

export async function getTeams(): Promise<APITeam[]> {
  return apiFetch(`/teams?league=${LEAGUE_ID}&season=${DEFAULT_SEASON}`)
}

/**
 * Ligas de Eliminatorias al Mundial 2026 a sincronizar.
 *
 * Configurable vía env `API_FOOTBALL_QUALIFIER_LEAGUES` con pares
 * `leagueId:season` separados por coma. Ej:
 *   API_FOOTBALL_QUALIFIER_LEAGUES="32:2026,34:2026,29:2026,30:2026,31:2026,33:2026,37:2026"
 *
 * IMPORTANTE: los IDs de liga dependen de la cuenta/plan de API-Football.
 * Verificalos en tu dashboard de API-Football antes de sincronizar.
 * Si la env está vacía, el sync de eliminatorias NO trae nada (cero datos
 * erróneos por defecto).
 */
export function getQualifierLeagueConfigs(): Array<{ league: number; season: number }> {
  const raw = process.env.API_FOOTBALL_QUALIFIER_LEAGUES?.trim()
  if (!raw) return []
  return raw
    .split(",")
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const [l, s] = pair.split(":").map((x) => parseInt(x.trim(), 10))
      return { league: l, season: s }
    })
    .filter((c) => Number.isFinite(c.league) && Number.isFinite(c.season))
}

export async function getQualifierFixtures(
  league: number,
  season: number
): Promise<APIFixture[]> {
  return apiFetch(`/fixtures?league=${league}&season=${season}`)
}

const STATUS_MAP: Record<string, "scheduled" | "live" | "finished" | "postponed"> = {
  NS: "scheduled",
  TBD: "scheduled",
  "1H": "live",
  HT: "live",
  "2H": "live",
  ET: "live",
  P: "live",
  FT: "finished",
  AET: "finished",
  PEN: "finished",
  PST: "postponed",
  CANC: "postponed",
  ABD: "postponed",
}

export function mapFixtureStatus(short: string): "scheduled" | "live" | "finished" | "postponed" {
  return STATUS_MAP[short] ?? "scheduled"
}

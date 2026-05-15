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

export async function getLiveFixtures(): Promise<APIFixture[]> {
  return apiFetch(`/fixtures?league=${LEAGUE_ID}&season=${DEFAULT_SEASON}&live=all`)
}

export async function getTeams(): Promise<APITeam[]> {
  return apiFetch(`/teams?league=${LEAGUE_ID}&season=${DEFAULT_SEASON}`)
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

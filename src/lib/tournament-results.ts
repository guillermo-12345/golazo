import type { SupabaseClient } from "@supabase/supabase-js"

export type TournamentResults = {
  isOver: boolean
  champion: string | null
  runnerUp: string | null
  thirdPlace: string | null
  fourthPlace: string | null
  topScorer: string | null
}

type MatchLite = {
  stage: string
  status: string
  home_team_code: string
  away_team_code: string
  home_score: number | null
  away_score: number | null
  extra_data: {
    winner?: string
    events?: Array<{ type?: string; detail?: string; player?: { name?: string } | null }>
  } | null
}

/** Chequeo liviano: ¿ya se jugó la final? (para el banner de campeón). */
export async function isTournamentOver(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>
): Promise<boolean> {
  const { data } = await supabase
    .from("matches")
    .select("status")
    .eq("stage", "final")
    .maybeSingle()
  return (data as { status?: string } | null)?.status === "finished"
}

function winnerLoser(m: MatchLite | undefined): [string | null, string | null] {
  if (!m || m.status !== "finished" || m.home_score === null || m.away_score === null) return [null, null]
  const w = m.extra_data?.winner
  if (w === "home") return [m.home_team_code, m.away_team_code]
  if (w === "away") return [m.away_team_code, m.home_team_code]
  if (m.home_score > m.away_score) return [m.home_team_code, m.away_team_code]
  if (m.away_score > m.home_score) return [m.away_team_code, m.home_team_code]
  return [null, null]
}

/**
 * Podio real del Mundial (campeón, subcampeón, 3º, 4º) y goleador del torneo,
 * a partir de la final, el partido por el 3er puesto y los eventos de gol.
 * isOver=false si la final todavía no se jugó.
 */
export async function getTournamentResults(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>
): Promise<TournamentResults> {
  const { data } = await supabase
    .from("matches")
    .select("stage, status, home_team_code, away_team_code, home_score, away_score, extra_data")
    .eq("status", "finished")

  const matches = (data ?? []) as MatchLite[]
  const final = matches.find((m) => m.stage === "final")
  const third = matches.find((m) => m.stage === "third_place")

  const [champion, runnerUp] = winnerLoser(final)
  const [thirdPlace, fourthPlace] = winnerLoser(third)

  // Goleador del torneo desde los eventos de gol (excluye en contra)
  const goals = new Map<string, number>()
  for (const m of matches) {
    for (const e of m.extra_data?.events ?? []) {
      if (e.type === "Goal" && !(e.detail ?? "").includes("Own") && e.player?.name) {
        goals.set(e.player.name, (goals.get(e.player.name) ?? 0) + 1)
      }
    }
  }
  let topScorer: string | null = null
  let max = 0
  for (const [name, n] of goals) {
    if (n > max) {
      max = n
      topScorer = name
    }
  }

  return {
    isOver: !!champion,
    champion,
    runnerUp,
    thirdPlace,
    fourthPlace,
    topScorer,
  }
}

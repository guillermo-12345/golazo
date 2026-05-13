import type { Match } from "@/types/database"

export type StandingRow = {
  teamCode: string
  teamName: string
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  points: number
}

/**
 * Calcula la tabla de posiciones de un grupo a partir de los partidos jugados.
 * Toma en cuenta solo partidos con status='finished' y scores definidos.
 */
export function calculateGroupStandings(
  teams: Array<{ name: string; code: string }>,
  matches: Match[]
): StandingRow[] {
  // Inicializar fila por cada equipo
  const rows = new Map<string, StandingRow>()
  for (const team of teams) {
    rows.set(team.code, {
      teamCode: team.code,
      teamName: team.name,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDiff: 0,
      points: 0,
    })
  }

  // Procesar partidos terminados
  for (const m of matches) {
    if (m.status !== "finished" || m.home_score === null || m.away_score === null) continue

    const home = rows.get(m.home_team_code)
    const away = rows.get(m.away_team_code)
    if (!home || !away) continue

    home.played += 1
    away.played += 1
    home.goalsFor += m.home_score
    home.goalsAgainst += m.away_score
    away.goalsFor += m.away_score
    away.goalsAgainst += m.home_score

    if (m.home_score > m.away_score) {
      home.won += 1
      home.points += 3
      away.lost += 1
    } else if (m.home_score < m.away_score) {
      away.won += 1
      away.points += 3
      home.lost += 1
    } else {
      home.drawn += 1
      away.drawn += 1
      home.points += 1
      away.points += 1
    }
  }

  // Calcular diferencia de goles y ordenar
  const result = Array.from(rows.values())
  for (const r of result) r.goalDiff = r.goalsFor - r.goalsAgainst

  result.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor
    return a.teamName.localeCompare(b.teamName)
  })

  return result
}

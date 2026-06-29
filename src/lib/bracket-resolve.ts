/**
 * Resolución automática del cuadro de eliminatorias.
 *
 * Cada partido de knockout guarda en extra_data.bracket {h, a} una
 * referencia de slot que se resuelve a un equipo real cuando hay datos:
 *   "1A"      → ganador del grupo A (cuando el grupo terminó)
 *   "2A"      → segundo del grupo A
 *   "3:CEFHI" → mejor tercero de esos grupos (se asigna al cerrar la fase)
 *   "WP73"    → ganador del partido 73
 *   "LP101"   → perdedor del partido 101
 *
 * Esta función es pura: recibe todos los partidos y devuelve qué slots se
 * pueden completar ahora. Se corre tras cada sync (cron), así el cuadro se
 * arma solo a medida que se definen los grupos y avanzan las rondas.
 *
 * Nota: la asignación exacta de los 8 mejores terceros sigue una tabla
 * oficial de FIFA según qué grupos clasifican terceros. No se auto-asigna
 * acá (queda la etiqueta "3º (...)") para no poner equipos equivocados;
 * se completa cuando termina la fase de grupos.
 */

export type BracketMatch = {
  api_fixture_id: number
  stage: string
  status: string
  group_name: string | null
  home_team: string
  away_team: string
  home_team_code: string
  away_team_code: string
  home_score: number | null
  away_score: number | null
  extra_data: { bracket?: { h: string; a: string } } | null
}

export type SlotFill = { code: string; name: string }
export type BracketUpdate = {
  api_fixture_id: number
  home_team: string
  home_team_code: string
  away_team: string
  away_team_code: string
}

// Número de partido (P73...) → api_fixture_id de la tabla matches
export const P_TO_FIXTURE: Record<number, number> = {}
for (let i = 0; i <= 15; i++) P_TO_FIXTURE[73 + i] = 99201 + i
for (let i = 0; i <= 7; i++) P_TO_FIXTURE[89 + i] = 99251 + i
for (let i = 0; i <= 3; i++) P_TO_FIXTURE[97 + i] = 99271 + i
P_TO_FIXTURE[101] = 99281
P_TO_FIXTURE[102] = 99282
P_TO_FIXTURE[103] = 99290
P_TO_FIXTURE[104] = 99299

type TeamRow = { code: string; name: string; pts: number; gd: number; gf: number }
type GroupStanding = { rows: TeamRow[]; complete: boolean }

/**
 * Posiciones por grupo con las reglas FIFA simplificadas (pts → dif. gol →
 * goles a favor). Incluye grupos incompletos (con `complete: false`) para
 * poder proyectar el cuadro en vivo.
 */
function computeStandingsAll(matches: BracketMatch[]): Map<string, GroupStanding> {
  const groups = new Map<string, Map<string, TeamRow>>()
  const finishedByGroup = new Map<string, number>()

  for (const m of matches) {
    if (m.stage !== "group_stage" || !m.group_name) continue
    if (m.status !== "finished" || m.home_score === null || m.away_score === null) continue

    const g = m.group_name
    if (!groups.has(g)) groups.set(g, new Map())
    finishedByGroup.set(g, (finishedByGroup.get(g) ?? 0) + 1)
    const table = groups.get(g)!

    const ensure = (code: string, name: string) => {
      if (!table.has(code)) table.set(code, { code, name, pts: 0, gd: 0, gf: 0 })
      return table.get(code)!
    }
    const home = ensure(m.home_team_code, m.home_team)
    const away = ensure(m.away_team_code, m.away_team)

    home.gf += m.home_score
    away.gf += m.away_score
    home.gd += m.home_score - m.away_score
    away.gd += m.away_score - m.home_score
    if (m.home_score > m.away_score) home.pts += 3
    else if (m.home_score < m.away_score) away.pts += 3
    else {
      home.pts += 1
      away.pts += 1
    }
  }

  const out = new Map<string, GroupStanding>()
  for (const [g, table] of groups) {
    const rows = [...table.values()].sort(
      (a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf
    )
    // Un grupo de 4 equipos juega 6 partidos
    out.set(g, { rows, complete: (finishedByGroup.get(g) ?? 0) >= 6 })
  }
  return out
}

/** Solo grupos terminados (para escribir equipos definitivos en la DB). */
function computeStandings(matches: BracketMatch[]): Map<string, TeamRow[]> {
  const standings = new Map<string, TeamRow[]>()
  for (const [g, s] of computeStandingsAll(matches)) {
    if (s.complete) standings.set(g, s.rows)
  }
  return standings
}

/** Ganador/perdedor de un partido terminado, orientado por marcador. */
function matchOutcome(
  m: BracketMatch | undefined,
  which: "W" | "L"
): SlotFill | null {
  if (!m || m.status !== "finished" || m.home_score === null || m.away_score === null) return null
  if (m.home_score === m.away_score) return null // sin definición por penales acá
  const homeWins = m.home_score > m.away_score
  const pick = (which === "W") === homeWins
  const code = pick ? m.home_team_code : m.away_team_code
  const name = pick ? m.home_team : m.away_team
  if (!code || code === "TBD") return null
  return { code, name }
}

/** Resuelve una referencia de slot a un equipo real, o null si aún no se puede. */
function resolveRef(
  ref: string,
  standings: Map<string, TeamRow[]>,
  byFixture: Map<number, BracketMatch>
): SlotFill | null {
  // Ganador/Perdedor de partido: WP73 / LP101
  const pm = ref.match(/^([WL])P(\d+)$/)
  if (pm) {
    const which = pm[1] as "W" | "L"
    const fixture = P_TO_FIXTURE[parseInt(pm[2], 10)]
    return matchOutcome(byFixture.get(fixture), which)
  }
  // 1ro/2do de grupo: 1A / 2B
  const gm = ref.match(/^([12])([A-L])$/)
  if (gm) {
    const pos = parseInt(gm[1], 10) - 1
    const rows = standings.get(gm[2])
    if (!rows || !rows[pos]) return null
    return { code: rows[pos].code, name: rows[pos].name }
  }
  // 3:GROUPS → mejores terceros: se asigna al cerrar la fase (no acá)
  return null
}

/**
 * Devuelve las actualizaciones de knockout posibles AHORA: solo slots que
 * se pueden resolver y que todavía están en TBD (no pisa equipos ya puestos).
 */
export function computeBracketUpdates(matches: BracketMatch[]): BracketUpdate[] {
  const standings = computeStandings(matches)
  const byFixture = new Map(matches.map((m) => [m.api_fixture_id, m]))
  const updates: BracketUpdate[] = []

  for (const m of matches) {
    if (m.stage === "group_stage") continue
    const refs = m.extra_data?.bracket
    if (!refs) continue

    const homeFill = m.home_team_code === "TBD" ? resolveRef(refs.h, standings, byFixture) : null
    const awayFill = m.away_team_code === "TBD" ? resolveRef(refs.a, standings, byFixture) : null
    if (!homeFill && !awayFill) continue

    updates.push({
      api_fixture_id: m.api_fixture_id,
      home_team: homeFill?.name ?? m.home_team,
      home_team_code: homeFill?.code ?? m.home_team_code,
      away_team: awayFill?.name ?? m.away_team,
      away_team_code: awayFill?.code ?? m.away_team_code,
    })
  }
  return updates
}

// ─────────────────────────────────────────────
// Proyección en vivo del cuadro (visualización, no escribe en la DB)
// ─────────────────────────────────────────────

export type SlotProjection = {
  code: string
  name: string
  /** true = aún puede cambiar (el grupo no terminó / posición no asegurada) */
  provisional: boolean
}

/** Resuelve una ref de slot contra las posiciones ACTUALES (aunque el grupo siga). */
function projectRef(
  ref: string,
  standings: Map<string, GroupStanding>,
  byFixture: Map<number, BracketMatch>
): SlotProjection | null {
  // Ganador/Perdedor de partido ya jugado → definitivo
  const pm = ref.match(/^([WL])P(\d+)$/)
  if (pm) {
    const fill = matchOutcome(byFixture.get(P_TO_FIXTURE[parseInt(pm[2], 10)]), pm[1] as "W" | "L")
    return fill ? { ...fill, provisional: false } : null
  }
  // 1º/2º de grupo según la tabla actual
  const gm = ref.match(/^([12])([A-L])$/)
  if (gm) {
    const pos = parseInt(gm[1], 10) - 1
    const s = standings.get(gm[2])
    if (!s || !s.rows[pos]) return null
    return { code: s.rows[pos].code, name: s.rows[pos].name, provisional: !s.complete }
  }
  // Mejores terceros: se proyectan recién al cerrar la fase (quedan con etiqueta)
  return null
}

/**
 * Para cada partido de knockout, proyecta quién iría según cómo van los grupos
 * AHORA. No escribe nada: la página lo usa para mostrar el cuadro en vivo.
 */
export function projectBracket(
  matches: BracketMatch[]
): Map<number, { home: SlotProjection | null; away: SlotProjection | null }> {
  const standings = computeStandingsAll(matches)
  const byFixture = new Map(matches.map((m) => [m.api_fixture_id, m]))
  const out = new Map<number, { home: SlotProjection | null; away: SlotProjection | null }>()

  for (const m of matches) {
    if (m.stage === "group_stage") continue
    const refs = m.extra_data?.bracket
    if (!refs) continue
    out.set(m.api_fixture_id, {
      home: projectRef(refs.h, standings, byFixture),
      away: projectRef(refs.a, standings, byFixture),
    })
  }
  return out
}

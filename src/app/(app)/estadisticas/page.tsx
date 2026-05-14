import { createClient } from "@/lib/supabase/server"
import TeamFlag from "@/components/TeamFlag"
import { BarChart3, Trophy, TrendingUp, Target, Users, Flame } from "lucide-react"
import Link from "next/link"
import { TEAMS } from "@/lib/teams"

export default async function EstadisticasPage() {
  const supabase = await createClient()

  // Total de usuarios, ligas, predicciones
  const [usersCount, leaguesCount, predsCount, bracketsRes, predsByTeamRes] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("leagues").select("*", { count: "exact", head: true }),
    supabase.from("predictions").select("*", { count: "exact", head: true }),
    supabase.from("bracket_predictions").select("bracket_data"),
    supabase.from("predictions").select("home_score_pred, away_score_pred, match_id, matches(home_team_code, away_team_code)"),
  ])

  // Brackets: contar quién predice qué equipos como campeón
  const championCount = new Map<string, number>()
  const topScorerCount = new Map<string, number>()
  const brackets = (bracketsRes.data ?? []) as Array<{
    bracket_data: { champion?: string; topScorer?: string }
  }>
  for (const b of brackets) {
    const c = b.bracket_data?.champion
    if (c) championCount.set(c, (championCount.get(c) ?? 0) + 1)
    const ts = b.bracket_data?.topScorer
    if (ts && ts.trim()) {
      const key = ts.trim()
      topScorerCount.set(key, (topScorerCount.get(key) ?? 0) + 1)
    }
  }

  const topChampions = Array.from(championCount.entries())
    .map(([code, count]) => ({ code, count, team: TEAMS[code] }))
    .filter((t) => t.team)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const topScorers = Array.from(topScorerCount.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Predicciones: contar qué equipos son los más predichos a ganar
  const teamWinCount = new Map<string, number>()
  const matchPredCount = new Map<string, number>()
  const predData = (predsByTeamRes.data ?? []) as unknown as Array<{
    home_score_pred: number
    away_score_pred: number
    match_id: string
    matches: { home_team_code: string; away_team_code: string } | null
  }>

  for (const p of predData) {
    if (!p.matches) continue
    matchPredCount.set(p.match_id, (matchPredCount.get(p.match_id) ?? 0) + 1)
    if (p.home_score_pred > p.away_score_pred) {
      teamWinCount.set(
        p.matches.home_team_code,
        (teamWinCount.get(p.matches.home_team_code) ?? 0) + 1
      )
    } else if (p.away_score_pred > p.home_score_pred) {
      teamWinCount.set(
        p.matches.away_team_code,
        (teamWinCount.get(p.matches.away_team_code) ?? 0) + 1
      )
    }
  }

  const totalBrackets = brackets.length
  const totalChampionPicks = Array.from(championCount.values()).reduce((a, b) => a + b, 0)
  const totalUsers = usersCount.count ?? 0
  const totalLeagues = leaguesCount.count ?? 0
  const totalPredictions = predsCount.count ?? 0

  return (
    <main className="max-w-4xl mx-auto px-4 md:px-8 py-8">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <BarChart3 size={28} className="text-blue-400" />
          <h1 className="text-2xl md:text-3xl font-black text-white">Estadísticas globales</h1>
        </div>
        <p className="text-gray-500 text-sm">Qué está pensando la comunidad de Golazo</p>
      </header>

      {/* Stats generales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <BigStat icon={Users} label="Usuarios" value={totalUsers} color="text-green-400" />
        <BigStat icon={Trophy} label="Ligas" value={totalLeagues} color="text-yellow-400" />
        <BigStat icon={Target} label="Predicciones" value={totalPredictions} color="text-blue-400" />
        <BigStat icon={Flame} label="Brackets armados" value={totalBrackets} color="text-orange-400" />
      </div>

      {/* Top 5 campeones predichos */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Trophy size={18} className="text-yellow-400" />
          <h2 className="text-lg font-bold text-white">Top 5 — Campeón más predicho</h2>
        </div>

        {topChampions.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
            <p className="text-gray-500 text-sm">Nadie completó el Bracket Challenge todavía</p>
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            {topChampions.map((c, idx) => {
              const pct = totalChampionPicks > 0 ? Math.round((c.count / totalChampionPicks) * 100) : 0
              return (
                <Link
                  key={c.code}
                  href={`/equipos/${c.code}`}
                  className="flex items-center gap-4 px-4 py-3 border-b border-white/5 last:border-b-0 hover:bg-white/[0.03] transition-colors"
                >
                  <span
                    className={`text-sm font-bold tabular-nums w-5 ${
                      idx === 0 ? "text-yellow-400" : "text-gray-500"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <TeamFlag code={c.code} size={32} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm">{c.team!.name}</p>
                    <div className="h-1.5 bg-white/5 rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-yellow-500 to-orange-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold tabular-nums">{pct}%</p>
                    <p className="text-gray-600 text-[10px]">{c.count} votos</p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* Top 5 goleadores */}
      {topScorers.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Target size={18} className="text-green-400" />
            <h2 className="text-lg font-bold text-white">Top 5 — Goleador más predicho</h2>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            {topScorers.map((s, idx) => (
              <div
                key={s.name}
                className="flex items-center gap-4 px-4 py-3 border-b border-white/5 last:border-b-0"
              >
                <span
                  className={`text-sm font-bold tabular-nums w-5 ${
                    idx === 0 ? "text-green-400" : "text-gray-500"
                  }`}
                >
                  {idx + 1}
                </span>
                <span className="text-2xl">⚽</span>
                <p className="text-white font-semibold text-sm flex-1">{s.name}</p>
                <p className="text-white font-bold tabular-nums">{s.count}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Equipos más predichos a ganar (por partido) */}
      {teamWinCount.size > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={18} className="text-blue-400" />
            <h2 className="text-lg font-bold text-white">Equipos favoritos por partido</h2>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            {Array.from(teamWinCount.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 8)
              .map(([code, count], idx) => {
                const team = TEAMS[code]
                if (!team) return null
                return (
                  <Link
                    key={code}
                    href={`/equipos/${code}`}
                    className="flex items-center gap-4 px-4 py-3 border-b border-white/5 last:border-b-0 hover:bg-white/[0.03] transition-colors"
                  >
                    <span className="text-sm font-bold tabular-nums w-5 text-gray-500">{idx + 1}</span>
                    <TeamFlag code={code} size={28} />
                    <p className="text-white font-semibold text-sm flex-1">{team.name}</p>
                    <p className="text-white font-bold tabular-nums">{count}</p>
                    <p className="text-gray-600 text-[10px]">predicciones a ganar</p>
                  </Link>
                )
              })}
          </div>
        </section>
      )}

      <p className="text-gray-600 text-xs text-center mt-12">
        Las estadísticas se actualizan en tiempo real conforme la gente predice
      </p>
    </main>
  )
}

function BigStat({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Trophy
  label: string
  value: number
  color: string
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
      <Icon size={20} className={`${color} mx-auto mb-2`} />
      <p className="text-3xl font-black text-white tabular-nums">{value.toLocaleString("es-AR")}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  )
}

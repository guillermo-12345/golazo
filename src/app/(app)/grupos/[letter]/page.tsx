import { createClient } from "@/lib/supabase/server"
import { getTeamsByGroup, GROUP_LETTERS } from "@/lib/teams"
import { calculateGroupStandings } from "@/lib/standings"
import type { Match } from "@/types/database"
import Link from "next/link"
import TeamFlag from "@/components/TeamFlag"
import LocalDateTime from "@/components/LocalDateTime"
import { ArrowLeft, Trophy, Calendar, Clock } from "lucide-react"
import { notFound } from "next/navigation"

export default async function GrupoDetailPage({
  params,
}: {
  params: Promise<{ letter: string }>
}) {
  const { letter } = await params
  const upperLetter = letter.toUpperCase()

  if (!GROUP_LETTERS.includes(upperLetter as (typeof GROUP_LETTERS)[number])) {
    notFound()
  }

  const teams = getTeamsByGroup(upperLetter)
  if (teams.length === 0) notFound()

  const supabase = await createClient()
  const { data: matchesData } = await supabase
    .from("matches")
    .select("*")
    .eq("group_name", upperLetter)
    .order("scheduled_at", { ascending: true })

  const matches = (matchesData ?? []) as Match[]
  const standings = calculateGroupStandings(
    teams.map((t) => ({ name: t.name, code: t.fifaCode })),
    matches
  )

  const finishedMatches = matches.filter((m) => m.status === "finished")
  const upcomingMatches = matches.filter((m) => m.status !== "finished")

  return (
    <main className="max-w-3xl mx-auto px-4 md:px-8 py-8">
      <Link
        href="/grupos"
        className="inline-flex items-center gap-2 text-gray-500 hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Todos los grupos
      </Link>

      {/* Header */}
      <div className="bg-gradient-to-br from-green-500/15 to-green-500/5 border border-green-500/30 rounded-3xl p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-green-500/20 border border-green-500/40 flex items-center justify-center">
            <span className="text-white font-black text-3xl">{upperLetter}</span>
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white">Grupo {upperLetter}</h1>
            <p className="text-gray-400 text-sm mt-0.5">
              {teams.length} selecciones · {matches.length} partidos
            </p>
          </div>
        </div>

        {/* Banderas */}
        <div className="flex flex-wrap gap-3 mt-5">
          {teams.map((t) => (
            <Link
              key={t.fifaCode}
              href={`/equipos/${t.fifaCode}`}
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-green-500/30 rounded-xl px-3 py-2 transition-colors"
            >
              <TeamFlag code={t.fifaCode} size={28} />
              <span className="text-white text-sm font-medium">{t.name}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Tabla de posiciones */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Trophy size={18} className="text-yellow-400" />
          <h2 className="text-lg font-bold text-white">Tabla de posiciones</h2>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[28px_24px_1fr_repeat(7,32px)] items-center gap-1 px-3 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-white/10">
            <span></span>
            <span></span>
            <span>Equipo</span>
            <span className="text-center">PJ</span>
            <span className="text-center">G</span>
            <span className="text-center">E</span>
            <span className="text-center">P</span>
            <span className="text-center">GF</span>
            <span className="text-center">GC</span>
            <span className="text-center text-green-400">PTS</span>
          </div>

          {standings.map((row, idx) => {
            const advances = idx < 2
            const playoff = idx === 2
            return (
              <div
                key={row.teamCode}
                className="grid grid-cols-[28px_24px_1fr_repeat(7,32px)] items-center gap-1 px-3 py-2.5 text-sm border-b border-white/5 last:border-b-0 hover:bg-white/[0.03]"
              >
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold ${
                    advances
                      ? "bg-green-500/20 text-green-400"
                      : playoff
                      ? "bg-orange-500/20 text-orange-400"
                      : "bg-white/5 text-gray-500"
                  }`}
                >
                  {idx + 1}
                </div>
                <TeamFlag code={row.teamCode} size={20} />
                <Link
                  href={`/equipos/${row.teamCode}`}
                  className="text-white font-medium truncate hover:text-green-400 transition-colors"
                >
                  {row.teamName}
                </Link>
                <span className="text-center text-gray-300 tabular-nums">{row.played}</span>
                <span className="text-center text-gray-300 tabular-nums">{row.won}</span>
                <span className="text-center text-gray-300 tabular-nums">{row.drawn}</span>
                <span className="text-center text-gray-300 tabular-nums">{row.lost}</span>
                <span className="text-center text-gray-400 tabular-nums">{row.goalsFor}</span>
                <span className="text-center text-gray-400 tabular-nums">{row.goalsAgainst}</span>
                <span className="text-center text-white font-black tabular-nums">{row.points}</span>
              </div>
            )
          })}
        </div>

        <p className="text-xs text-gray-500 mt-2 px-1">
          <span className="text-green-400">●</span> Clasifican a octavos &nbsp;·&nbsp;
          <span className="text-orange-400">●</span> Mejor tercero (eventual)
        </p>
      </section>

      {/* Partidos finalizados */}
      {finishedMatches.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
            Resultados
          </h2>
          <div className="space-y-2">
            {finishedMatches.map((m) => (
              <MatchRow key={m.id} match={m} finished />
            ))}
          </div>
        </section>
      )}

      {/* Próximos partidos */}
      {upcomingMatches.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Calendar size={14} />
            Próximos partidos
          </h2>
          <div className="space-y-2">
            {upcomingMatches.map((m) => (
              <MatchRow key={m.id} match={m} />
            ))}
          </div>
        </section>
      )}
    </main>
  )
}

function MatchRow({ match, finished }: { match: Match; finished?: boolean }) {
  return (
    <Link
      href={`/partidos/${match.id}`}
      className="block bg-white/5 border border-white/10 hover:border-green-500/30 rounded-xl p-3 transition-colors"
    >
      <div className="flex items-center justify-between mb-1.5 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Clock size={11} />
          <LocalDateTime date={match.scheduled_at} formatStr="d MMM · HH:mm" />
        </span>
        {match.venue && <span className="truncate ml-2">{match.venue}</span>}
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex items-center gap-2 justify-end">
          <span className="text-white text-sm font-medium truncate">{match.home_team}</span>
          <TeamFlag code={match.home_team_code} size={24} />
        </div>
        <div className="text-center min-w-[60px]">
          {finished ? (
            <span className="text-white font-black text-base">
              {match.home_score ?? 0}-{match.away_score ?? 0}
            </span>
          ) : (
            <span className="text-gray-500 text-xs">vs</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <TeamFlag code={match.away_team_code} size={24} />
          <span className="text-white text-sm font-medium truncate">{match.away_team}</span>
        </div>
      </div>
    </Link>
  )
}

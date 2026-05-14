import { createClient } from "@/lib/supabase/server"
import { getTeamByCode, getFlagUrl } from "@/lib/teams"
import type { Match } from "@/types/database"
import Link from "next/link"
import TeamFlag from "@/components/TeamFlag"
import LocalDateTime from "@/components/LocalDateTime"
import { ArrowLeft, Clock, MapPin, Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { notFound } from "next/navigation"

export default async function EquipoDetailPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const team = getTeamByCode(code)
  if (!team) notFound()

  const supabase = await createClient()

  // Todos los partidos donde participa este equipo
  const { data: matchesData } = await supabase
    .from("matches")
    .select("*")
    .or(`home_team_code.eq.${team.fifaCode},away_team_code.eq.${team.fifaCode}`)
    .order("scheduled_at", { ascending: true })

  const matches = (matchesData ?? []) as Match[]
  const played = matches.filter((m) => m.status === "finished")
  const upcoming = matches.filter((m) => m.status !== "finished")

  // Estadísticas
  let wins = 0
  let draws = 0
  let losses = 0
  let goalsFor = 0
  let goalsAgainst = 0
  for (const m of played) {
    if (m.home_score === null || m.away_score === null) continue
    const isHome = m.home_team_code === team.fifaCode
    const myScore = isHome ? m.home_score : m.away_score
    const opponentScore = isHome ? m.away_score : m.home_score
    goalsFor += myScore
    goalsAgainst += opponentScore
    if (myScore > opponentScore) wins++
    else if (myScore < opponentScore) losses++
    else draws++
  }

  return (
    <main className="max-w-3xl mx-auto px-4 md:px-8 py-8">
      <Link
        href={team.group ? `/grupos/${team.group}` : "/partidos"}
        className="inline-flex items-center gap-2 text-gray-500 hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        {team.group ? `Grupo ${team.group}` : "Partidos"}
      </Link>

      {/* Hero del equipo */}
      <div className="relative bg-gradient-to-br from-white/10 to-white/5 border border-white/15 rounded-3xl p-8 mb-6 overflow-hidden">
        <div
          className="absolute inset-0 opacity-10 blur-2xl"
          style={{
            backgroundImage: `url(${getFlagUrl(team.fifaCode, 320)})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
          <TeamFlag code={team.fifaCode} size={120} className="shadow-2xl" />
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-black text-white">{team.name}</h1>
            <p className="text-gray-400 mt-1 text-sm">
              {team.fifaCode}
              {team.group && (
                <>
                  {" · "}
                  <Link href={`/grupos/${team.group}`} className="hover:text-green-400 transition-colors">
                    Grupo {team.group}
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      {played.length > 0 && (
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mb-8">
          <StatCard label="Jugados" value={played.length} color="text-gray-300" />
          <StatCard label="Ganados" value={wins} color="text-green-400" icon={TrendingUp} />
          <StatCard label="Empatados" value={draws} color="text-yellow-400" icon={Minus} />
          <StatCard label="Perdidos" value={losses} color="text-red-400" icon={TrendingDown} />
          <StatCard label="Goles" value={`${goalsFor}:${goalsAgainst}`} color="text-blue-400" />
        </div>
      )}

      {/* Próximos partidos */}
      {upcoming.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
            Próximos partidos ({upcoming.length})
          </h2>
          <div className="space-y-2">
            {upcoming.map((m) => (
              <TeamMatchRow key={m.id} match={m} teamCode={team.fifaCode} />
            ))}
          </div>
        </section>
      )}

      {/* Historial */}
      {played.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={16} className="text-yellow-400" />
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
              Historial ({played.length})
            </h2>
          </div>
          <div className="space-y-2">
            {played.map((m) => (
              <TeamMatchRow key={m.id} match={m} teamCode={team.fifaCode} finished />
            ))}
          </div>
        </section>
      )}

      {matches.length === 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <p className="text-gray-500 text-sm">No hay partidos cargados para esta selección todavía</p>
        </div>
      )}
    </main>
  )
}

function StatCard({
  label,
  value,
  color,
  icon: Icon,
}: {
  label: string
  value: number | string
  color: string
  icon?: typeof Trophy
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
      {Icon && <Icon size={14} className={`${color} mx-auto mb-1`} />}
      <p className={`text-xl font-black ${color}`}>{value}</p>
      <p className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-wider">{label}</p>
    </div>
  )
}

function TeamMatchRow({
  match,
  teamCode,
  finished,
}: {
  match: Match
  teamCode: string
  finished?: boolean
}) {
  const isHome = match.home_team_code === teamCode
  const myScore = isHome ? match.home_score : match.away_score
  const opponentScore = isHome ? match.away_score : match.home_score
  const opponentCode = isHome ? match.away_team_code : match.home_team_code
  const opponentName = isHome ? match.away_team : match.home_team

  let resultColor = "text-gray-400"
  let resultLabel = ""
  if (finished && myScore !== null && opponentScore !== null) {
    if (myScore > opponentScore) {
      resultColor = "text-green-400"
      resultLabel = "G"
    } else if (myScore < opponentScore) {
      resultColor = "text-red-400"
      resultLabel = "P"
    } else {
      resultColor = "text-yellow-400"
      resultLabel = "E"
    }
  }

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
        <span className="text-[10px] uppercase tracking-wider">{match.stage.replace(/_/g, " ")}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 font-bold w-8">{isHome ? "LOC" : "VIS"}</span>
        <TeamFlag code={opponentCode} size={24} />
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">vs {opponentName}</p>
          {match.venue && (
            <p className="text-gray-600 text-xs flex items-center gap-1">
              <MapPin size={10} />
              {match.venue}
            </p>
          )}
        </div>
        {finished && myScore !== null && opponentScore !== null ? (
          <div className="text-right">
            <p className="text-white font-black tabular-nums">
              {myScore}-{opponentScore}
            </p>
            <p className={`text-[10px] font-bold ${resultColor}`}>{resultLabel}</p>
          </div>
        ) : (
          <span className="text-green-400 text-xs font-medium">Predecir →</span>
        )}
      </div>
    </Link>
  )
}

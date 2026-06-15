import { createClient } from "@/lib/supabase/server"
import type { Match } from "@/types/database"
import { getTeamByCode } from "@/lib/teams"
import TeamFlag from "@/components/TeamFlag"
import LocalDateTime from "@/components/LocalDateTime"
import { Swords, MapPin } from "lucide-react"
import Link from "next/link"

// Orden y etiqueta de cada ronda de eliminatorias
const ROUNDS: Array<{ stage: string; label: string; color: string }> = [
  { stage: "round_of_32", label: "Dieciseisavos", color: "text-blue-400" },
  { stage: "round_of_16", label: "Octavos", color: "text-cyan-400" },
  { stage: "quarter_final", label: "Cuartos de final", color: "text-purple-400" },
  { stage: "semi_final", label: "Semifinales", color: "text-pink-400" },
  { stage: "third_place", label: "Tercer puesto", color: "text-orange-400" },
  { stage: "final", label: "Final", color: "text-yellow-400" },
]

export default async function LlavesPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("matches")
    .select("*")
    .neq("stage", "group_stage")
    .order("scheduled_at", { ascending: true })

  const matches = (data ?? []) as Match[]
  const byStage = (stage: string) =>
    matches.filter((m) => m.stage === stage).sort((a, b) => a.api_fixture_id - b.api_fixture_id)

  return (
    <main className="max-w-3xl mx-auto px-4 md:px-8 py-8">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Swords size={28} className="text-yellow-400" />
          <h1 className="text-2xl md:text-3xl font-black text-white">Llaves de eliminatorias</h1>
        </div>
        <p className="text-gray-500 text-sm">
          El cuadro del Mundial 2026, de dieciseisavos a la final. Los cruces se
          van completando con los equipos reales a medida que terminan los grupos.
        </p>
      </header>

      {matches.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
          <Swords size={40} className="text-gray-600 mx-auto mb-4" />
          <p className="text-gray-300 font-medium">Las llaves aún no están cargadas</p>
        </div>
      ) : (
        <div className="space-y-8">
          {ROUNDS.map(({ stage, label, color }) => {
            const roundMatches = byStage(stage)
            if (roundMatches.length === 0) return null
            return (
              <section key={stage}>
                <h2 className={`text-sm font-bold uppercase tracking-wider mb-3 ${color}`}>
                  {label}
                  <span className="text-gray-600 font-normal ml-2">
                    {roundMatches.length} {roundMatches.length === 1 ? "partido" : "partidos"}
                  </span>
                </h2>
                <div className="grid gap-2 sm:grid-cols-2">
                  {roundMatches.map((m) => (
                    <BracketCard key={m.id} match={m} />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </main>
  )
}

function BracketCard({ match }: { match: Match }) {
  const finished = match.status === "finished"
  const homeWon =
    finished && match.home_score !== null && match.away_score !== null && match.home_score > match.away_score
  const awayWon =
    finished && match.home_score !== null && match.away_score !== null && match.away_score > match.home_score

  return (
    <Link
      href={`/partidos/${match.id}`}
      className={`block rounded-xl border p-3 transition-colors ${
        match.status === "live"
          ? "bg-red-500/[0.03] border-red-500/40 hover:border-red-500/60"
          : "bg-white/5 border-white/10 hover:border-green-500/30"
      }`}
    >
      <div className="flex items-center justify-between mb-2 text-[10px] text-gray-500">
        <LocalDateTime date={match.scheduled_at} formatStr="d MMM · HH:mm" />
        {match.venue && (
          <span className="flex items-center gap-1 truncate max-w-[55%]">
            <MapPin size={9} className="shrink-0" />
            <span className="truncate">{match.venue}</span>
          </span>
        )}
      </div>
      <BracketSlot
        team={match.home_team}
        code={match.home_team_code}
        score={match.home_score}
        finished={finished}
        winner={homeWon}
      />
      <div className="h-px bg-white/5 my-1.5" />
      <BracketSlot
        team={match.away_team}
        code={match.away_team_code}
        score={match.away_score}
        finished={finished}
        winner={awayWon}
      />
    </Link>
  )
}

function BracketSlot({
  team,
  code,
  score,
  finished,
  winner,
}: {
  team: string
  code: string
  score: number | null
  finished: boolean
  winner: boolean
}) {
  const known = !!getTeamByCode(code)
  return (
    <div className="flex items-center gap-2">
      {known ? (
        <TeamFlag code={code} size={22} linkToCountry={false} />
      ) : (
        <span className="w-[22px] h-[15px] rounded bg-white/10 border border-white/10 shrink-0" />
      )}
      <span
        className={`flex-1 min-w-0 truncate text-sm ${
          known ? (winner ? "text-white font-bold" : "text-gray-200") : "text-gray-500 italic"
        }`}
      >
        {known ? team : team /* etiqueta tipo "1º Grupo A" o "Ganador P73" */}
      </span>
      {finished && (
        <span className={`text-sm font-black tabular-nums ${winner ? "text-green-400" : "text-gray-500"}`}>
          {score ?? 0}
        </span>
      )}
    </div>
  )
}

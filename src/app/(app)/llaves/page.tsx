import { createClient } from "@/lib/supabase/server"
import type { Match } from "@/types/database"
import { getTeamByCode } from "@/lib/teams"
import { projectBracket, type BracketMatch, type SlotProjection } from "@/lib/bracket-resolve"
import TeamFlag from "@/components/TeamFlag"
import LocalDateTime from "@/components/LocalDateTime"
import { Swords, MapPin } from "lucide-react"
import Link from "next/link"

const ROUNDS: Array<{ stage: string; label: string; color: string }> = [
  { stage: "round_of_32", label: "Dieciseisavos", color: "text-blue-400" },
  { stage: "round_of_16", label: "Octavos", color: "text-cyan-400" },
  { stage: "quarter_final", label: "Cuartos de final", color: "text-purple-400" },
  { stage: "semi_final", label: "Semifinales", color: "text-pink-400" },
  { stage: "third_place", label: "Tercer puesto", color: "text-orange-400" },
  { stage: "final", label: "Final", color: "text-yellow-400" },
]

type SlotDisplay = { name: string; code: string; known: boolean; provisional: boolean }

/** Qué mostrar en un slot: equipo confirmado (en la DB), proyección en vivo, o etiqueta. */
function slotDisplay(
  label: string,
  code: string,
  proj: SlotProjection | null
): SlotDisplay {
  // Ya confirmado (el sync escribió el equipo real al cerrar el grupo/ronda)
  if (getTeamByCode(code)) return { name: label, code, known: true, provisional: false }
  // Proyección en vivo según cómo van los grupos
  if (proj) return { name: proj.name, code: proj.code, known: true, provisional: proj.provisional }
  // Sin datos aún (terceros, ganadores futuros): etiqueta "1º Grupo A" / "Ganador P73"
  return { name: label, code, known: false, provisional: false }
}

export default async function LlavesPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("matches")
    .select("*")
    .order("scheduled_at", { ascending: true })

  const all = (data ?? []) as Match[]
  const projection = projectBracket(all as unknown as BracketMatch[])
  const knockout = all.filter((m) => m.stage !== "group_stage")

  const byStage = (stage: string) =>
    knockout.filter((m) => m.stage === stage).sort((a, b) => a.api_fixture_id - b.api_fixture_id)

  return (
    <main className="max-w-3xl mx-auto px-4 md:px-8 py-8">
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Swords size={28} className="text-yellow-400" />
          <h1 className="text-2xl md:text-3xl font-black text-white">Llaves de eliminatorias</h1>
        </div>
        <p className="text-gray-500 text-sm">
          El cuadro se va armando en vivo según cómo van los grupos. Los equipos
          en <span className="text-amber-400/90">provisional</span> todavía pueden
          cambiar; quedan fijos cuando termina cada grupo.
        </p>
      </header>

      {knockout.length === 0 ? (
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
                    <BracketCard
                      key={m.id}
                      match={m}
                      home={slotDisplay(m.home_team, m.home_team_code, projection.get(m.api_fixture_id)?.home ?? null)}
                      away={slotDisplay(m.away_team, m.away_team_code, projection.get(m.api_fixture_id)?.away ?? null)}
                    />
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

function BracketCard({ match, home, away }: { match: Match; home: SlotDisplay; away: SlotDisplay }) {
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
      <BracketSlot slot={home} score={match.home_score} finished={finished} winner={homeWon} />
      <div className="h-px bg-white/5 my-1.5" />
      <BracketSlot slot={away} score={match.away_score} finished={finished} winner={awayWon} />
    </Link>
  )
}

function BracketSlot({
  slot,
  score,
  finished,
  winner,
}: {
  slot: SlotDisplay
  score: number | null
  finished: boolean
  winner: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      {slot.known ? (
        <TeamFlag code={slot.code} size={22} linkToCountry={false} className={slot.provisional ? "opacity-60" : ""} />
      ) : (
        <span className="w-[22px] h-[15px] rounded bg-white/10 border border-white/10 shrink-0" />
      )}
      <span
        className={`flex-1 min-w-0 truncate text-sm flex items-center gap-1.5 ${
          !slot.known
            ? "text-gray-500 italic"
            : winner
            ? "text-white font-bold"
            : slot.provisional
            ? "text-gray-300"
            : "text-gray-200"
        }`}
      >
        <span className="truncate">{slot.name}</span>
        {slot.provisional && (
          <span className="shrink-0 text-[9px] uppercase tracking-wider text-amber-400/80 bg-amber-400/10 rounded px-1 py-px">
            prov
          </span>
        )}
      </span>
      {finished && (
        <span className={`text-sm font-black tabular-nums ${winner ? "text-green-400" : "text-gray-500"}`}>
          {score ?? 0}
        </span>
      )}
    </div>
  )
}

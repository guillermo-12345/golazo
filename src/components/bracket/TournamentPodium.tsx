import TeamFlag from "@/components/TeamFlag"
import { getTeamByCode } from "@/lib/teams"
import type { TournamentResults } from "@/lib/tournament-results"
import { Trophy } from "lucide-react"

const ROWS: Array<{ key: keyof TournamentResults; label: string; medal: string; color: string }> = [
  { key: "champion", label: "Campeón", medal: "🥇", color: "text-yellow-400" },
  { key: "runnerUp", label: "Subcampeón", medal: "🥈", color: "text-gray-300" },
  { key: "thirdPlace", label: "Tercer puesto", medal: "🥉", color: "text-orange-400" },
  { key: "fourthPlace", label: "Cuarto puesto", medal: "4️⃣", color: "text-amber-700" },
]

/** Podio real del Mundial + goleador (para la página del Bracket Challenge). */
export default function TournamentPodium({ results }: { results: TournamentResults }) {
  if (!results.isOver) return null
  const teamName = (code: string | null) => (code ? getTeamByCode(code)?.name ?? code : "—")

  return (
    <div className="bg-gradient-to-br from-yellow-500/12 to-orange-500/5 border border-yellow-500/25 rounded-2xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Trophy size={18} className="text-yellow-400" />
        <h2 className="text-white font-black text-base">Resultado final del Mundial</h2>
      </div>

      <div className="space-y-2">
        {ROWS.map((r) => {
          const code = results[r.key] as string | null
          return (
            <div key={r.key} className="flex items-center gap-3 bg-black/20 rounded-xl px-3 py-2">
              <span className="text-lg w-6 text-center shrink-0">{r.medal}</span>
              <span className={`text-xs font-bold uppercase tracking-wider w-24 shrink-0 ${r.color}`}>
                {r.label}
              </span>
              {code && <TeamFlag code={code} size={22} linkToCountry={false} />}
              <span className="text-white font-bold text-sm truncate">{teamName(code)}</span>
            </div>
          )
        })}

        {results.topScorer && (
          <div className="flex items-center gap-3 bg-black/20 rounded-xl px-3 py-2">
            <span className="text-lg w-6 text-center shrink-0">⚽</span>
            <span className="text-xs font-bold uppercase tracking-wider w-24 shrink-0 text-green-400">
              Goleador
            </span>
            <span className="text-white font-bold text-sm truncate">{results.topScorer}</span>
          </div>
        )}
      </div>
    </div>
  )
}

import { createClient } from "@/lib/supabase/server"
import { GROUP_LETTERS, getTeamsByGroup } from "@/lib/teams"
import { calculateGroupStandings } from "@/lib/standings"
import type { Match } from "@/types/database"
import Link from "next/link"
import TeamFlag from "@/components/TeamFlag"
import { ChevronRight } from "lucide-react"

export default async function GruposPage() {
  const supabase = await createClient()
  const { data: matchesData } = await supabase
    .from("matches")
    .select("*")
    .eq("stage", "group_stage")

  const matches = (matchesData ?? []) as Match[]

  return (
    <main className="max-w-5xl mx-auto px-4 md:px-8 py-8">
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-black text-white">Grupos del Mundial</h1>
        <p className="text-gray-500 mt-1 text-sm">12 grupos · 48 selecciones · 4 países por grupo</p>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {GROUP_LETTERS.map((letter) => {
          const teams = getTeamsByGroup(letter)
          const groupMatches = matches.filter((m) => m.group_name === letter)
          const standings = calculateGroupStandings(
            teams.map((t) => ({ name: t.name, code: t.fifaCode })),
            groupMatches
          )
          const finishedCount = groupMatches.filter((m) => m.status === "finished").length

          return (
            <Link
              key={letter}
              href={`/grupos/${letter}`}
              className="bg-white/5 border border-white/10 hover:border-green-500/40 rounded-2xl p-5 transition-all hover:bg-white/[0.07] group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/30 to-green-500/10 border border-green-500/40 flex items-center justify-center">
                    <span className="text-white font-black text-lg">{letter}</span>
                  </div>
                  <div>
                    <p className="text-white font-bold">Grupo {letter}</p>
                    <p className="text-gray-500 text-xs">
                      {finishedCount}/6 partidos jugados
                    </p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-500 group-hover:text-green-400 transition-colors" />
              </div>

              <div className="space-y-2">
                {standings.map((row, idx) => (
                  <div key={row.teamCode} className="flex items-center gap-3 text-sm">
                    <span
                      className={`w-5 text-center text-xs font-bold ${
                        idx < 2
                          ? "text-green-400"
                          : idx === 2
                          ? "text-orange-400"
                          : "text-gray-600"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <TeamFlag code={row.teamCode} size={24} />
                    <span className="text-gray-200 flex-1 truncate">{row.teamName}</span>
                    <span className="text-white font-bold tabular-nums">{row.points}</span>
                  </div>
                ))}
              </div>

              <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-gray-500">
                <span>2 mejores avanzan a octavos</span>
                <span className="text-green-400/70">{finishedCount === 6 ? "Finalizado" : "En curso"}</span>
              </div>
            </Link>
          )
        })}
      </div>
    </main>
  )
}

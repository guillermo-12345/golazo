import { GROUP_LETTERS, getTeamsByGroup } from "@/lib/teams"
import Link from "next/link"
import TeamFlag from "@/components/TeamFlag"
import { ChevronRight } from "lucide-react"

export default function PaisesPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 md:px-8 py-8">
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-black text-white">Países</h1>
        <p className="text-gray-500 mt-1 text-sm">
          48 selecciones clasificadas · Tocá un país para ver sus partidos, alineación y estadísticas
        </p>
      </header>

      <div className="space-y-8">
        {GROUP_LETTERS.map((letter) => {
          const teams = getTeamsByGroup(letter)
          return (
            <section key={letter}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-green-500/30 to-green-500/10 border border-green-500/40 flex items-center justify-center">
                  <span className="text-white font-black text-xs">{letter}</span>
                </div>
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                  Grupo {letter}
                </h2>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                {teams.map((team) => (
                  <Link
                    key={team.fifaCode}
                    href={`/paises/${team.fifaCode}`}
                    className="flex items-center gap-3 bg-white/5 border border-white/10 hover:border-green-500/40 rounded-2xl p-4 transition-all hover:bg-white/[0.07] group"
                  >
                    <TeamFlag code={team.fifaCode} size={36} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold truncate">{team.name}</p>
                      <p className="text-gray-500 text-xs">{team.fifaCode}</p>
                    </div>
                    <ChevronRight
                      size={16}
                      className="text-gray-600 group-hover:text-green-400 transition-colors shrink-0"
                    />
                  </Link>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </main>
  )
}

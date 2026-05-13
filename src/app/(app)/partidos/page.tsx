import { createClient } from "@/lib/supabase/server"
import { Calendar, Clock } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { Match } from "@/types/database"

export default async function PartidosPage() {
  const supabase = await createClient()

  const { data: matchesData } = await supabase
    .from("matches")
    .select("*")
    .order("scheduled_at", { ascending: true })

  const matches = (matchesData ?? []) as Match[]

  const upcoming = matches.filter((m) => m.status === "scheduled")
  const live = matches.filter((m) => m.status === "live")
  const finished = matches.filter((m) => m.status === "finished")

  return (
    <main className="max-w-4xl mx-auto px-4 md:px-8 py-8">
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-black text-white">Partidos</h1>
        <p className="text-gray-500 mt-1 text-sm">Mundial USA · Canadá · México 2026</p>
      </header>

      {matches.length === 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
          <Calendar size={40} className="text-gray-600 mx-auto mb-4" />
          <p className="text-gray-300 font-medium">Los partidos aparecerán acá</p>
          <p className="text-gray-500 text-sm mt-2">
            El Mundial 2026 arranca en junio. Vamos a sincronizar el fixture cuando esté disponible.
          </p>
        </div>
      )}

      {live.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-bold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            En vivo
          </h2>
          <MatchList matches={live} />
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
            Próximos ({upcoming.length})
          </h2>
          <MatchList matches={upcoming} />
        </section>
      )}

      {finished.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
            Finalizados
          </h2>
          <MatchList matches={finished} />
        </section>
      )}
    </main>
  )
}

function MatchList({ matches }: { matches: Match[] }) {
  return (
    <div className="space-y-2">
      {matches.map((m) => (
        <Link
          key={m.id}
          href={`/partidos/${m.id}`}
          className="block bg-white/5 border border-white/10 hover:border-green-500/30 rounded-2xl p-4 transition-colors"
        >
          <div className="flex items-center justify-between mb-2 text-xs text-gray-500">
            <span>{m.stage}</span>
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {format(new Date(m.scheduled_at), "d MMM · HH:mm", { locale: es })}
            </span>
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <div className="text-right">
              <p className="text-white font-bold text-sm md:text-base">{m.home_team}</p>
              <p className="text-gray-600 text-xs">{m.home_team_code}</p>
            </div>
            <div className="text-center">
              {m.status === "scheduled" ? (
                <span className="text-gray-500 text-sm">vs</span>
              ) : (
                <span className="text-white font-black text-xl">
                  {m.home_score ?? 0} - {m.away_score ?? 0}
                </span>
              )}
            </div>
            <div className="text-left">
              <p className="text-white font-bold text-sm md:text-base">{m.away_team}</p>
              <p className="text-gray-600 text-xs">{m.away_team_code}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}

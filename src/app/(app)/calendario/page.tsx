import { createClient } from "@/lib/supabase/server"
import type { Match } from "@/types/database"
import MatchesByDay from "@/components/matches/MatchesByDay"
import { CalendarDays } from "lucide-react"

export default async function CalendarioPage() {
  const supabase = await createClient()
  const { data: matchesData } = await supabase
    .from("matches")
    .select("*")
    .order("scheduled_at", { ascending: true })

  const matches = (matchesData ?? []) as Match[]

  return (
    <main className="max-w-4xl mx-auto px-4 md:px-8 py-8">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <CalendarDays size={28} className="text-green-400" />
          <h1 className="text-2xl md:text-3xl font-black text-white">Calendario del Mundial</h1>
        </div>
        <p className="text-gray-500 text-sm">
          Del 11 de junio al 19 de julio de 2026 · {matches.length} partidos
          <span className="block text-gray-600 text-xs mt-1">
            Los horarios se muestran en tu zona horaria local
          </span>
        </p>
      </header>

      {matches.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
          <CalendarDays size={40} className="text-gray-600 mx-auto mb-4" />
          <p className="text-gray-300 font-medium">No hay partidos cargados todavía</p>
          <p className="text-gray-500 text-sm mt-2">
            Corré el seed SQL en Supabase para cargar el calendario
          </p>
        </div>
      ) : (
        <MatchesByDay matches={matches} />
      )}
    </main>
  )
}

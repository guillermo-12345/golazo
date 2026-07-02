import { createClient } from "@/lib/supabase/server"
import type { Match } from "@/types/database"
import CalendarView from "@/components/matches/CalendarView"
import { CalendarDays } from "lucide-react"

export default async function CalendarioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [matchesRes, predsRes] = await Promise.all([
    supabase.from("matches").select("*").order("scheduled_at", { ascending: true }),
    user
      ? supabase.from("predictions").select("match_id").eq("user_id", user.id)
      : Promise.resolve({ data: [] as { match_id: string }[] }),
  ])

  const matches = (matchesRes.data ?? []) as Match[]
  const predictedIds = ((predsRes.data ?? []) as { match_id: string }[]).map((p) => p.match_id)

  return (
    <main className="max-w-4xl mx-auto px-4 md:px-8 py-6">
      <header className="mb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-green-500/15 border border-green-500/30 flex items-center justify-center shrink-0">
            <CalendarDays size={22} className="text-green-400" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-white">Calendario</h1>
            <p className="text-gray-500 text-xs">
              {matches.length} partidos · 11 jun – 19 jul · tu horario local
            </p>
          </div>
        </div>
      </header>

      {matches.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
          <CalendarDays size={40} className="text-gray-600 mx-auto mb-4" />
          <p className="text-gray-300 font-medium">No hay partidos cargados todavía</p>
        </div>
      ) : (
        <CalendarView matches={matches} predictedIds={predictedIds} />
      )}
    </main>
  )
}

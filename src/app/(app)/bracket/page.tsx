import { createClient } from "@/lib/supabase/server"
import BracketForm from "@/components/bracket/BracketForm"
import { GitBranch, Lock, Trophy } from "lucide-react"
import { redirect } from "next/navigation"

export default async function BracketPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // Ligas del usuario donde podemos guardar el bracket
  const { data: leaguesData } = await supabase
    .from("league_members")
    .select("league_id, leagues(id, name, banner_color, config)")
    .eq("user_id", user.id)

  const leagues = (leaguesData ?? []) as unknown as Array<{
    league_id: string
    leagues: {
      id: string
      name: string
      banner_color: string
      config: { allowBracketChallenge?: boolean } | null
    } | null
  }>

  const validLeagues = leagues
    .filter((l) => l.leagues && l.leagues.config?.allowBracketChallenge !== false)
    .map((l) => l.leagues!)

  // Bracket predictions existentes
  const { data: bracketData } = await supabase
    .from("bracket_predictions")
    .select("*")
    .eq("user_id", user.id)

  const existingBrackets = (bracketData ?? []) as Array<{
    league_id: string
    bracket_data: {
      champion?: string
      runnerUp?: string
      thirdPlace?: string
      fourthPlace?: string
      topScorer?: string
    }
    points_earned: number
  }>

  // Cierre del bracket: fin del 24 de junio 2026 (medianoche hora Argentina)
  const bracketDeadline = new Date("2026-06-25T02:59:59Z")
  const isLocked = new Date() > bracketDeadline

  return (
    <main className="max-w-3xl mx-auto px-4 md:px-8 py-8">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <GitBranch size={28} className="text-yellow-400" />
          <h1 className="text-2xl md:text-3xl font-black text-white">Bracket Challenge</h1>
        </div>
        <p className="text-gray-500 text-sm">
          Predecí el podio del Mundial 2026 antes del 24 de junio. Cada acierto suma puntos a tu liga.
        </p>
      </header>

      {/* Tabla de puntos */}
      <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/5 border border-yellow-500/20 rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Trophy size={16} className="text-yellow-400" />
          <h2 className="text-white font-bold text-sm">Cómo se puntúa</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
          <ScoreCard label="Campeón" pts={50} emoji="🥇" />
          <ScoreCard label="Subcampeón" pts={25} emoji="🥈" />
          <ScoreCard label="3er puesto" pts={15} emoji="🥉" />
          <ScoreCard label="4to puesto" pts={10} emoji="4️⃣" />
          <ScoreCard label="Goleador" pts={25} emoji="⚽" />
        </div>
        <p className="text-xs text-gray-500 mt-3 text-center">
          Máximo posible: <span className="text-yellow-400 font-bold">125 puntos</span>
        </p>
      </div>

      {isLocked && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 mb-6 text-center">
          <Lock size={24} className="text-red-400 mx-auto mb-2" />
          <p className="text-white font-bold">El bracket está cerrado</p>
          <p className="text-gray-400 text-sm mt-1">Cerró el 24 de junio</p>
        </div>
      )}

      {validLeagues.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <p className="text-gray-400">Tenés que estar en alguna liga para hacer el bracket</p>
        </div>
      ) : (
        <BracketForm
          leagues={validLeagues}
          existingBrackets={existingBrackets}
          isLocked={isLocked}
        />
      )}
    </main>
  )
}

function ScoreCard({ label, pts, emoji }: { label: string; pts: number; emoji: string }) {
  return (
    <div className="bg-black/30 border border-white/5 rounded-xl p-2.5">
      <div className="text-xl mb-1">{emoji}</div>
      <p className="text-yellow-400 font-black text-base">+{pts}</p>
      <p className="text-gray-500 text-[10px] uppercase tracking-wider">{label}</p>
    </div>
  )
}

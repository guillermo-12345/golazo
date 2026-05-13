import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Plus, Search, Hash, Trophy, Globe, Lock } from "lucide-react"
import LeagueIcon from "@/components/LeagueIcon"

export default async function LigasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [myLeaguesRes, publicLeaguesRes] = await Promise.all([
    supabase
      .from("league_members")
      .select("league_id, points, rank, leagues(*)")
      .eq("user_id", user!.id)
      .order("points", { ascending: false }),
    supabase
      .from("leagues")
      .select("*")
      .eq("type", "public")
      .order("created_at", { ascending: false })
      .limit(10),
  ])

  const myLeagues = (myLeaguesRes.data ?? []) as unknown as Array<{
    league_id: string
    points: number
    rank: number | null
    leagues: {
      id: string
      name: string
      description: string | null
      type: string
      banner_color: string
      is_verified: boolean
      config: { icon?: { style: string; seed: string } } | null
    } | null
  }>

  const myLeagueIds = new Set(myLeagues.map((m) => m.league_id))
  const publicLeagues = (publicLeaguesRes.data ?? []).filter(
    (l) => !myLeagueIds.has((l as { id: string }).id)
  ) as Array<{
    id: string
    name: string
    description: string | null
    banner_color: string
    is_verified: boolean
    config: { icon?: { style: string; seed: string } } | null
  }>

  return (
    <main className="max-w-4xl mx-auto px-4 md:px-8 py-8">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white">Ligas</h1>
          <p className="text-gray-500 mt-1 text-sm">Competí con quien quieras</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/ligas/unirse"
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors border border-white/10"
          >
            <Hash size={16} />
            <span className="hidden sm:inline">Código</span>
          </Link>
          <Link
            href="/ligas/crear"
            className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black font-bold px-4 py-2.5 rounded-xl text-sm transition-colors"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Crear liga</span>
          </Link>
        </div>
      </header>

      {/* Mis ligas */}
      <section className="mb-10">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
          Mis ligas ({myLeagues.length})
        </h2>

        {myLeagues.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
            <Trophy size={32} className="text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No estás en ninguna liga todavía</p>
            <p className="text-gray-600 text-sm mt-1">Creá una nueva o unite con un código</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myLeagues.map((member) => {
              const league = member.leagues
              if (!league) return null
              return (
                <Link
                  key={member.league_id}
                  href={`/ligas/${member.league_id}`}
                  className="flex items-center gap-4 bg-white/5 border border-white/10 hover:border-green-500/30 rounded-2xl p-4 transition-colors group"
                >
                  <LeagueIcon
                    config={league.config?.icon}
                    name={league.name}
                    id={league.id}
                    bannerColor={league.banner_color}
                    size={48}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-semibold truncate">{league.name}</p>
                      {league.is_verified && <span className="text-yellow-400 text-xs">✓</span>}
                      {league.type === "global" && <Globe size={12} className="text-blue-400" />}
                      {league.type === "private" && <Lock size={12} className="text-gray-500" />}
                    </div>
                    <p className="text-gray-500 text-xs">
                      {league.type === "global" ? "Liga oficial" : league.type === "public" ? "Pública" : "Privada"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">{member.points}</p>
                    <p className="text-gray-500 text-xs">{member.rank ? `#${member.rank}` : "—"}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* Explorar */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Explorar</h2>
          <Search size={14} className="text-gray-500" />
        </div>

        {publicLeagues.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
            <p className="text-gray-500 text-sm">No hay ligas públicas para explorar todavía</p>
          </div>
        ) : (
          <div className="space-y-3">
            {publicLeagues.map((league) => (
              <Link
                key={league.id}
                href={`/ligas/${league.id}`}
                className="flex items-center gap-4 bg-white/5 border border-white/10 hover:border-green-500/30 rounded-2xl p-4 transition-colors"
              >
                <LeagueIcon
                  config={league.config?.icon}
                  name={league.name}
                  id={league.id}
                  bannerColor={league.banner_color}
                  size={48}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-semibold truncate">{league.name}</p>
                    {league.is_verified && <span className="text-yellow-400 text-xs">✓</span>}
                  </div>
                  {league.description && (
                    <p className="text-gray-500 text-xs truncate">{league.description}</p>
                  )}
                </div>
                <span className="text-green-500 text-xs font-bold">UNIRSE</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

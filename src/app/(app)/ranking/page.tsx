import { createClient } from "@/lib/supabase/server"
import Avatar from "@/components/Avatar"
import { Trophy, Crown, Medal, TrendingUp } from "lucide-react"
import Link from "next/link"

export default async function RankingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Top 100 usuarios por suma total de puntos en todas sus ligas
  const { data: rankingData } = await supabase
    .from("league_members")
    .select("user_id, points, profiles(username, display_name, avatar_config)")
    .order("points", { ascending: false })
    .limit(500) // traemos más y agregamos en memoria

  // Sumar puntos de todas las ligas por usuario
  const aggregated = new Map<
    string,
    { user_id: string; total: number; profile: { username: string; display_name: string; avatar_config: unknown } }
  >()

  const rows = (rankingData ?? []) as unknown as Array<{
    user_id: string
    points: number
    profiles: { username: string; display_name: string; avatar_config: unknown } | null
  }>

  for (const row of rows) {
    if (!row.profiles) continue
    const existing = aggregated.get(row.user_id)
    if (existing) {
      existing.total += row.points
    } else {
      aggregated.set(row.user_id, {
        user_id: row.user_id,
        total: row.points,
        profile: row.profiles,
      })
    }
  }

  const ranking = Array.from(aggregated.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 100)

  const myRank = ranking.findIndex((r) => r.user_id === user!.id)

  return (
    <main className="max-w-3xl mx-auto px-4 md:px-8 py-8">
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Trophy size={28} className="text-yellow-400" />
          <h1 className="text-2xl md:text-3xl font-black text-white">Ranking global</h1>
        </div>
        <p className="text-gray-500 text-sm">
          Top 100 de Golazo · puntos sumados de todas las ligas
        </p>
      </header>

      {/* Tu posición */}
      {myRank >= 0 && (
        <div className="bg-gradient-to-r from-green-500/10 to-green-500/5 border border-green-500/30 rounded-2xl p-4 mb-6 flex items-center gap-4">
          <div className="text-center">
            <p className="text-green-400 text-xs font-bold uppercase tracking-wider">Tu posición</p>
            <p className="text-white text-3xl font-black">#{myRank + 1}</p>
          </div>
          <div className="flex-1 border-l border-green-500/20 pl-4">
            <p className="text-gray-400 text-xs">Puntos totales</p>
            <p className="text-white text-xl font-bold">{ranking[myRank].total}</p>
          </div>
          <TrendingUp size={28} className="text-green-400" />
        </div>
      )}

      {/* Podio Top 3 */}
      {ranking.length >= 3 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {/* Plata (#2) */}
          <PodiumCard rank={2} entry={ranking[1]} isMe={ranking[1].user_id === user!.id} />
          {/* Oro (#1) */}
          <PodiumCard rank={1} entry={ranking[0]} isMe={ranking[0].user_id === user!.id} elevated />
          {/* Bronce (#3) */}
          <PodiumCard rank={3} entry={ranking[2]} isMe={ranking[2].user_id === user!.id} />
        </div>
      )}

      {/* Resto del ranking */}
      <section>
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
          Posiciones 4 - 100
        </h2>
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          {ranking.slice(3).map((entry, idx) => {
            const position = idx + 4
            const isMe = entry.user_id === user!.id
            return (
              <Link
                key={entry.user_id}
                href={`/u/${entry.profile.username}`}
                className={`flex items-center gap-4 px-4 py-3 border-b border-white/5 last:border-b-0 hover:bg-white/[0.03] transition-colors ${
                  isMe ? "bg-green-500/5" : ""
                }`}
              >
                <span className="w-8 text-center text-sm font-bold text-gray-500 tabular-nums">
                  {position}
                </span>
                <Avatar
                  config={entry.profile.avatar_config}
                  username={entry.profile.username}
                  size={36}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-semibold truncate text-sm">
                      {entry.profile.display_name}
                    </p>
                    {isMe && <span className="text-green-400 text-xs">(vos)</span>}
                  </div>
                  <p className="text-gray-600 text-xs">@{entry.profile.username}</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-black tabular-nums">{entry.total}</p>
                  <p className="text-gray-600 text-[10px]">puntos</p>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {ranking.length === 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
          <Trophy size={32} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">El ranking aparece cuando alguien empiece a ganar puntos</p>
        </div>
      )}
    </main>
  )
}

function PodiumCard({
  rank,
  entry,
  isMe,
  elevated,
}: {
  rank: number
  entry: {
    user_id: string
    total: number
    profile: { username: string; display_name: string; avatar_config: unknown }
  }
  isMe: boolean
  elevated?: boolean
}) {
  const colors = {
    1: { bg: "from-yellow-500/20 to-yellow-500/5", border: "border-yellow-500/40", icon: "text-yellow-400" },
    2: { bg: "from-gray-400/20 to-gray-400/5", border: "border-gray-400/40", icon: "text-gray-300" },
    3: { bg: "from-orange-500/20 to-orange-500/5", border: "border-orange-500/40", icon: "text-orange-400" },
  }
  const c = colors[rank as 1 | 2 | 3]

  return (
    <Link
      href={`/u/${entry.profile.username}`}
      className={`bg-gradient-to-br ${c.bg} border ${c.border} rounded-2xl p-4 text-center flex flex-col items-center transition-transform hover:scale-105 ${
        elevated ? "transform sm:-translate-y-2" : ""
      } ${isMe ? "ring-2 ring-green-500/40" : ""}`}
    >
      {rank === 1 && <Crown size={24} className={`${c.icon} mb-2`} />}
      {rank === 2 && <Medal size={20} className={`${c.icon} mb-2`} />}
      {rank === 3 && <Medal size={20} className={`${c.icon} mb-2`} />}

      <Avatar config={entry.profile.avatar_config} username={entry.profile.username} size={48} />

      <p className="text-white font-bold text-sm mt-2 truncate w-full">
        {entry.profile.display_name}
      </p>
      <p className="text-gray-600 text-[10px] truncate w-full">@{entry.profile.username}</p>

      <p className={`font-black text-xl mt-2 ${c.icon}`}>{entry.total}</p>
      <p className="text-gray-500 text-[10px]">pts</p>
    </Link>
  )
}

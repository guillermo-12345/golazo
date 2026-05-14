import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Avatar from "@/components/Avatar"
import BadgeIcon from "@/components/BadgeIcon"
import { getAvatarBgHex } from "@/lib/avatar"
import { ALL_BADGES, type BadgeType } from "@/lib/badges"
import { Trophy, Award, Calendar, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import LeagueIcon from "@/components/LeagueIcon"

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_config, bio, created_at")
    .eq("username", username.toLowerCase())
    .single()

  if (!profile) notFound()

  const p = profile as {
    id: string
    username: string
    display_name: string
    avatar_config: unknown
    bio: string | null
    created_at: string
  }

  const [leaguesRes, badgesRes] = await Promise.all([
    supabase
      .from("league_members")
      .select("league_id, points, rank, leagues(id, name, type, banner_color, config)")
      .eq("user_id", p.id)
      .order("points", { ascending: false }),
    supabase
      .from("badges")
      .select("badge_type, earned_at")
      .eq("user_id", p.id)
      .order("earned_at", { ascending: false }),
  ])

  const leagues = (leaguesRes.data ?? []) as unknown as Array<{
    league_id: string
    points: number
    rank: number | null
    leagues: {
      id: string
      name: string
      type: "global" | "public" | "private"
      banner_color: string
      config: { icon?: { style: string; seed: string } } | null
    } | null
  }>

  // Filtramos: solo mostrar ligas globales/públicas (las privadas no se exponen)
  const publicLeagues = leagues.filter((m) => m.leagues && m.leagues.type !== "private")

  const badges = (badgesRes.data ?? []) as Array<{ badge_type: BadgeType; earned_at: string }>
  const earnedSet = new Set(badges.map((b) => b.badge_type))
  const totalPoints = leagues.reduce((sum, l) => sum + l.points, 0)
  const accentColor = getAvatarBgHex(p.avatar_config)

  return (
    <main className="max-w-2xl mx-auto px-4 md:px-8 py-8">
      <Link
        href="/ranking"
        className="inline-flex items-center gap-2 text-gray-500 hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Volver al ranking
      </Link>

      {/* Hero */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-8 mb-6 text-center relative overflow-hidden">
        <div
          className="absolute -top-20 left-1/2 -translate-x-1/2 w-60 h-60 rounded-full blur-3xl opacity-30"
          style={{ backgroundColor: accentColor }}
        />
        <div className="relative z-10">
          <div className="flex justify-center mb-4">
            <Avatar config={p.avatar_config} username={p.username} size={120} className="border-4" />
          </div>
          <h1 className="text-2xl font-black text-white">{p.display_name}</h1>
          <p className="text-gray-500 text-sm">@{p.username}</p>
          {p.bio && <p className="text-gray-400 text-sm mt-3 max-w-xs mx-auto">{p.bio}</p>}
          <p className="text-gray-600 text-xs mt-3 flex items-center gap-1 justify-center">
            <Calendar size={11} />
            Se unió {formatDistanceToNow(new Date(p.created_at), { addSuffix: true, locale: es })}
          </p>
        </div>
      </div>

      {/* Stats públicas */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="Puntos" value={totalPoints} color="text-yellow-400" icon={Trophy} />
        <StatCard label="Ligas" value={leagues.length} color="text-green-400" icon={Trophy} />
        <StatCard label="Logros" value={badges.length} color="text-purple-400" icon={Award} />
      </div>

      {/* Ligas públicas */}
      {publicLeagues.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
            Ligas públicas ({publicLeagues.length})
          </h2>
          <div className="space-y-2">
            {publicLeagues.map((m) => {
              const league = m.leagues!
              return (
                <Link
                  key={m.league_id}
                  href={`/ligas/${m.league_id}`}
                  className="flex items-center gap-4 bg-white/5 border border-white/10 hover:border-green-500/30 rounded-2xl p-3 transition-colors"
                >
                  <LeagueIcon
                    config={league.config?.icon}
                    name={league.name}
                    id={league.id}
                    bannerColor={league.banner_color}
                    size={40}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate text-sm">{league.name}</p>
                    <p className="text-gray-500 text-xs capitalize">{league.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">{m.points}</p>
                    <p className="text-gray-600 text-xs">{m.rank ? `#${m.rank}` : "—"}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Logros */}
      <section>
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
          Logros ({badges.length}/{ALL_BADGES.length})
        </h2>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
            {ALL_BADGES.map((b) => (
              <BadgeIcon key={b.type} type={b.type} size="md" locked={!earnedSet.has(b.type)} />
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}

function StatCard({
  label,
  value,
  color,
  icon: Icon,
}: {
  label: string
  value: number | string
  color: string
  icon: typeof Trophy
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
      <Icon size={18} className={`${color} mx-auto mb-2`} />
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  )
}

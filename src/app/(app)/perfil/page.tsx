import { createClient } from "@/lib/supabase/server"
import { Award, Trophy, Target, Flame, Edit3 } from "lucide-react"
import Link from "next/link"
import type { Profile } from "@/types/database"
import Avatar from "@/components/Avatar"
import { getAvatarBgHex } from "@/lib/avatar"
import BadgeIcon from "@/components/BadgeIcon"
import { ALL_BADGES, type BadgeType } from "@/lib/badges"

export default async function PerfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [profileRes, leaguesRes, badgesRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user!.id).single(),
    supabase
      .from("league_members")
      .select("league_id, points")
      .eq("user_id", user!.id),
    supabase.from("badges").select("*").eq("user_id", user!.id),
  ])

  const profile = profileRes.data as Profile | null
  const leagues = (leaguesRes.data ?? []) as Array<{ league_id: string; points: number }>
  const badges = (badgesRes.data ?? []) as Array<{ badge_type: string; earned_at: string }>

  const totalPoints = leagues.reduce((sum, l) => sum + l.points, 0)
  const accentColor = getAvatarBgHex(profile?.avatar_config)
  const earnedBadgeTypes = new Set(badges.map((b) => b.badge_type as BadgeType))

  return (
    <main className="max-w-2xl mx-auto px-4 md:px-8 py-8">
      {/* Avatar + identidad */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-8 mb-6 text-center relative overflow-hidden">
        <div
          className="absolute -top-20 left-1/2 -translate-x-1/2 w-60 h-60 rounded-full blur-3xl opacity-30"
          style={{ backgroundColor: accentColor }}
        />
        <div className="relative z-10">
          <div className="flex justify-center mb-4">
            <Avatar
              config={profile?.avatar_config}
              username={profile?.username}
              size={120}
              className="border-4"
            />
          </div>
          <h1 className="text-2xl font-black text-white">{profile?.display_name}</h1>
          <p className="text-gray-500 text-sm">@{profile?.username}</p>
          {profile?.bio && <p className="text-gray-400 text-sm mt-3 max-w-xs mx-auto">{profile.bio}</p>}

          <Link
            href="/perfil/editar"
            className="inline-flex items-center gap-1.5 mt-4 text-gray-400 hover:text-white text-sm transition-colors"
          >
            <Edit3 size={14} />
            Editar perfil
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Trophy} label="Puntos" value={totalPoints} color="text-yellow-400" />
        <StatCard icon={Award} label="Ligas" value={leagues.length} color="text-green-400" />
        <StatCard icon={Target} label="Aciertos" value="0%" color="text-blue-400" />
        <StatCard icon={Flame} label="Racha" value="0" color="text-orange-400" />
      </div>

      {/* Badges */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
            Logros ({badges.length}/{ALL_BADGES.length})
          </h2>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
            {ALL_BADGES.map((badge) => {
              const earned = earnedBadgeTypes.has(badge.type)
              return (
                <BadgeIcon
                  key={badge.type}
                  type={badge.type}
                  size="md"
                  locked={!earned}
                />
              )
            })}
          </div>
          {badges.length === 0 && (
            <p className="text-gray-500 text-xs text-center mt-5">
              Tus logros se desbloquean prediciendo, creando ligas y subiendo en la tabla
            </p>
          )}
        </div>
      </section>
    </main>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Trophy
  label: string
  value: number | string
  color: string
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
      <Icon size={18} className={`${color} mx-auto mb-2`} />
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  )
}

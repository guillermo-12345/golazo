import { createClient } from "@/lib/supabase/server"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { Trophy, Flame, Target, Award } from "lucide-react"
import Link from "next/link"
import type { Profile, Match } from "@/types/database"
import LeagueIcon from "@/components/LeagueIcon"
import TeamFlag from "@/components/TeamFlag"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [profileRes, matchesRes, leaguesRes, predictionsRes, badgesRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user!.id).single(),
    supabase
      .from("matches")
      .select("*")
      .eq("status", "scheduled")
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(5),
    supabase
      .from("league_members")
      .select("league_id, points, rank, leagues(*)")
      .eq("user_id", user!.id)
      .order("points", { ascending: false })
      .limit(3),
    supabase
      .from("predictions")
      .select("points_earned, match_id")
      .eq("user_id", user!.id)
      .not("points_earned", "is", null),
    supabase.from("badges").select("badge_type").eq("user_id", user!.id),
  ])

  const profile = profileRes.data as Profile | null
  const upcomingMatches = (matchesRes.data ?? []) as Match[]
  const myLeagues = (leaguesRes.data ?? []) as unknown as Array<{
    league_id: string
    points: number
    rank: number | null
    leagues: {
      id: string
      name: string
      type: string
      banner_color: string
      is_verified: boolean
      config: { icon?: { style: string; seed: string } } | null
    } | null
  }>

  // Calcular stats personales
  const predictions = (predictionsRes.data ?? []) as Array<{
    points_earned: number | null
    match_id: string
  }>
  const totalPoints = myLeagues.reduce((sum, m) => sum + m.points, 0)
  const totalPredictions = predictions.length
  const successfulPredictions = predictions.filter((p) => (p.points_earned ?? 0) > 0).length
  const effectiveness =
    totalPredictions > 0 ? Math.round((successfulPredictions / totalPredictions) * 100) : 0

  // Racha actual: predicciones consecutivas con puntos > 0
  // TODO: ordenar por fecha de partido (necesita join con matches)
  let streak = 0
  for (const p of predictions) {
    if ((p.points_earned ?? 0) > 0) streak++
    else break
  }

  const badgesCount = (badgesRes.data ?? []).length

  return (
    <main className="max-w-4xl mx-auto px-4 md:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-black text-white">
          Hola, <span className="text-green-500">{profile?.display_name}</span> 👋
        </h1>
        <p className="text-gray-500 mt-1">¿Listo para predecir los próximos partidos?</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
          <Trophy size={20} className="text-yellow-400 mx-auto mb-2" />
          <p className="text-2xl font-black text-white">{totalPoints}</p>
          <p className="text-xs text-gray-500">Puntos totales</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
          <Flame size={20} className="text-orange-400 mx-auto mb-2" />
          <p className="text-2xl font-black text-white">{streak}</p>
          <p className="text-xs text-gray-500">Racha actual</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
          <Target size={20} className="text-green-400 mx-auto mb-2" />
          <p className="text-2xl font-black text-white">{effectiveness}%</p>
          <p className="text-xs text-gray-500">Efectividad</p>
        </div>
        <Link
          href="/perfil"
          className="bg-white/5 border border-white/10 hover:border-purple-500/30 rounded-2xl p-4 text-center transition-colors"
        >
          <Award size={20} className="text-purple-400 mx-auto mb-2" />
          <p className="text-2xl font-black text-white">{badgesCount}</p>
          <p className="text-xs text-gray-500">Logros</p>
        </Link>
      </div>

      {totalPredictions > 0 && (
        <div className="text-xs text-gray-600 text-center mb-6 -mt-4">
          {successfulPredictions} de {totalPredictions} predicciones acertadas
        </div>
      )}

      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Próximos partidos</h2>
          <Link href="/partidos" className="text-green-500 hover:text-green-400 text-sm font-medium transition-colors">
            Ver todos →
          </Link>
        </div>

        {upcomingMatches.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
            <p className="text-gray-500">Los partidos del Mundial aparecerán aquí.</p>
            <p className="text-gray-600 text-sm mt-1">El torneo arranca en junio 2026.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingMatches.map((match) => (
              <div key={match.id} className="bg-white/5 border border-white/10 hover:border-green-500/30 rounded-2xl p-4 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <TeamFlag code={match.home_team_code} size={28} />
                    <div className="text-center flex-1">
                      <p className="text-xs text-gray-500 mb-1">
                        {formatDistanceToNow(new Date(match.scheduled_at), { addSuffix: true, locale: es })}
                      </p>
                      <p className="text-white font-bold text-sm">vs</p>
                    </div>
                    <TeamFlag code={match.away_team_code} size={28} />
                  </div>
                  <Link
                    href={`/partidos/${match.id}`}
                    className="ml-4 bg-green-500/10 hover:bg-green-500/20 text-green-400 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Predecir
                  </Link>
                </div>
                <div className="flex justify-between mt-2 text-sm text-gray-400 font-medium">
                  <span className="truncate">{match.home_team}</span>
                  <span className="truncate text-right">{match.away_team}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Mis ligas</h2>
          <Link href="/ligas" className="text-green-500 hover:text-green-400 text-sm font-medium transition-colors">
            Ver todas →
          </Link>
        </div>

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
                  size={40}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-semibold truncate">{league.name}</p>
                    {league.is_verified && <span className="text-yellow-400 text-xs">✓</span>}
                  </div>
                  <p className="text-gray-500 text-xs capitalize">{league.type}</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-bold">{member.points} pts</p>
                  {member.rank && <p className="text-gray-500 text-xs">#{member.rank}</p>}
                </div>
              </Link>
            )
          })}

          <Link
            href="/ligas/crear"
            className="flex items-center justify-center gap-2 border border-dashed border-white/20 hover:border-green-500/40 rounded-2xl p-4 text-gray-500 hover:text-green-400 transition-colors"
          >
            + Crear nueva liga
          </Link>
        </div>
      </section>
    </main>
  )
}

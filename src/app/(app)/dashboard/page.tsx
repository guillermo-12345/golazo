import { createClient } from "@/lib/supabase/server"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { Trophy, Flame, Target, Award, History, ChevronRight } from "lucide-react"
import Link from "next/link"
import type { Profile, Match } from "@/types/database"
import LeagueIcon from "@/components/LeagueIcon"
import TeamFlag from "@/components/TeamFlag"
import DailyChallenge from "@/components/DailyChallenge"
import WelcomeBanner from "@/components/WelcomeBanner"
import { getLocale } from "@/lib/get-locale"

const GLOBAL_LEAGUE_ID = "00000000-0000-0000-0000-000000000001"

export default async function DashboardPage() {
  const supabase = await createClient()
  const locale = await getLocale()
  const { data: { user } } = await supabase.auth.getUser()

  const [profileRes, matchesRes, leaguesRes, predictionsRes, badgesRes, recentRes, globalCountRes] = await Promise.all([
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
      .order("points", { ascending: false }),
    supabase
      .from("predictions")
      .select("points_earned, match_id, league_id")
      .eq("user_id", user!.id)
      .not("points_earned", "is", null),
    supabase.from("badges").select("badge_type").eq("user_id", user!.id),
    supabase
      .from("matches")
      .select("*")
      .eq("status", "finished")
      .order("scheduled_at", { ascending: false })
      .limit(5),
    supabase
      .from("league_members")
      .select("user_id", { count: "exact", head: true })
      .eq("league_id", GLOBAL_LEAGUE_ID),
  ])

  const profile = profileRes.data as Profile | null
  const upcomingMatches = (matchesRes.data ?? []) as Match[]
  const recentResults = (recentRes.data ?? []) as Match[]
  const globalMembersCount = globalCountRes.count ?? 0
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

  // Posición en la Liga Global (la oficial donde están todos)
  const globalMembership = myLeagues.find((m) => m.leagues?.type === "global")

  // Calcular stats personales
  const predictions = (predictionsRes.data ?? []) as Array<{
    points_earned: number | null
    match_id: string
    league_id: string
  }>

  // Mapa partido -> mis puntos (prioriza la Liga Global para consistencia con el hero)
  const myPointsByMatch = new Map<string, number>()
  for (const p of predictions) {
    if (p.league_id === GLOBAL_LEAGUE_ID) myPointsByMatch.set(p.match_id, p.points_earned ?? 0)
  }
  for (const p of predictions) {
    if (!myPointsByMatch.has(p.match_id)) myPointsByMatch.set(p.match_id, p.points_earned ?? 0)
  }
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
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-black text-white">
          Hola, <span className="text-green-500">{profile?.display_name}</span> 👋
        </h1>
        <p className="text-gray-500 mt-1">
          {locale === "es-AR"
            ? "¿Listo para predecir los próximos partidos?"
            : "¿Listo para predecir los próximos partidos?"}
        </p>
      </div>

      {/* Banner de bienvenida — se muestra una sola vez */}
      <WelcomeBanner displayName={profile?.display_name ?? ""} />

      {/* Tu posición en la Liga Global — visible sin entrar a la liga */}
      {globalMembership && (
        <Link
          href={`/ligas/${GLOBAL_LEAGUE_ID}`}
          className="flex items-center gap-4 bg-gradient-to-r from-yellow-500/15 via-yellow-500/5 to-transparent border border-yellow-500/30 hover:border-yellow-500/50 rounded-2xl p-5 mb-6 transition-colors group"
        >
          <div className="w-12 h-12 rounded-xl bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center shrink-0">
            <Trophy size={24} className="text-yellow-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-yellow-500/80 uppercase tracking-wider mb-0.5">
              Tu posición · Liga Global
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">
                {globalMembership.rank ? `#${globalMembership.rank}` : "—"}
              </span>
              {globalMembersCount > 0 && (
                <span className="text-gray-500 text-sm">de {globalMembersCount}</span>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-black text-yellow-400">{globalMembership.points}</p>
            <p className="text-xs text-gray-500">puntos</p>
          </div>
          <ChevronRight size={20} className="text-gray-600 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </Link>
      )}

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

      {/* Desafío diario — solo aparece si hay partidos hoy */}
      <DailyChallenge />

      {/* CTA Crear Liga — visible si el usuario solo está en la liga global */}
      {myLeagues.length <= 1 && (
        <Link
          href="/ligas/crear"
          className="flex items-center gap-4 bg-gradient-to-r from-green-500/15 to-transparent border border-green-500/30 hover:border-green-500/50 rounded-2xl p-4 mb-8 transition-colors group"
        >
          <div className="w-11 h-11 rounded-xl bg-green-500/20 border border-green-500/40 flex items-center justify-center shrink-0">
            <Trophy size={20} className="text-green-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm">Creá tu propia liga</p>
            <p className="text-gray-400 text-xs mt-0.5">
              Invitá a tus amigos y competí en tu tabla privada
            </p>
          </div>
          <span className="text-green-400 text-xl group-hover:translate-x-0.5 transition-transform">
            →
          </span>
        </Link>
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
                <div className="flex items-center gap-2 sm:gap-3">
                  {/* Equipo local: bandera + nombre apilados */}
                  <div className="flex flex-col items-center gap-1.5 w-16 sm:w-24 shrink-0">
                    <TeamFlag code={match.home_team_code} size={28} />
                    <span className="text-xs text-gray-400 font-medium text-center leading-tight line-clamp-2">
                      {match.home_team}
                    </span>
                  </div>

                  {/* Centro: tiempo + vs */}
                  <div className="text-center flex-1 min-w-0">
                    <p className="text-xs text-gray-500 mb-1">
                      {formatDistanceToNow(new Date(match.scheduled_at), { addSuffix: true, locale: es })}
                    </p>
                    <p className="text-white font-bold text-sm">vs</p>
                  </div>

                  {/* Equipo visitante: bandera + nombre apilados */}
                  <div className="flex flex-col items-center gap-1.5 w-16 sm:w-24 shrink-0">
                    <TeamFlag code={match.away_team_code} size={28} />
                    <span className="text-xs text-gray-400 font-medium text-center leading-tight line-clamp-2">
                      {match.away_team}
                    </span>
                  </div>

                  <Link
                    href={`/partidos/${match.id}`}
                    className="shrink-0 ml-1 sm:ml-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Predecir
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Últimos resultados — qué pasó y cómo me fue, sin ir al calendario */}
      {recentResults.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <History size={18} className="text-blue-400" />
              <h2 className="text-lg font-bold text-white">Últimos resultados</h2>
            </div>
            <Link href="/calendario" className="text-green-500 hover:text-green-400 text-sm font-medium transition-colors">
              Ver todos →
            </Link>
          </div>

          <div className="space-y-3">
            {recentResults.map((match) => {
              const myPts = myPointsByMatch.get(match.id)
              const played = myPts !== undefined
              return (
                <Link
                  key={match.id}
                  href={`/partidos/${match.id}`}
                  className="flex items-center gap-3 bg-white/5 border border-white/10 hover:border-blue-500/30 rounded-2xl p-4 transition-colors"
                >
                  {/* Local */}
                  <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                    <span className="text-xs text-gray-400 font-medium truncate text-right">
                      {match.home_team}
                    </span>
                    <TeamFlag code={match.home_team_code} size={24} />
                  </div>

                  {/* Marcador */}
                  <div className="shrink-0 px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                    <span className="text-white font-black tabular-nums text-sm">
                      {match.home_score}-{match.away_score}
                    </span>
                  </div>

                  {/* Visitante */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <TeamFlag code={match.away_team_code} size={24} />
                    <span className="text-xs text-gray-400 font-medium truncate">
                      {match.away_team}
                    </span>
                  </div>

                  {/* Cómo me fue */}
                  <div className="shrink-0 w-14 text-right">
                    {played ? (
                      <span
                        className={`text-xs font-bold ${
                          myPts > 0 ? "text-green-400" : "text-gray-600"
                        }`}
                      >
                        {myPts > 0 ? `+${myPts}` : "0 pts"}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-700">No jugaste</span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

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

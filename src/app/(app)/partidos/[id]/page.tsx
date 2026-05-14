import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { ArrowLeft, Clock, MapPin, Users } from "lucide-react"
import Link from "next/link"
import type { Match } from "@/types/database"
import PredictionForm from "@/components/predictions/PredictionForm"
import PredictionsSocialFeed from "@/components/predictions/PredictionsSocialFeed"
import TeamFlag from "@/components/TeamFlag"
import LocalDateTime from "@/components/LocalDateTime"

export default async function PartidoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [matchRes, leaguesRes] = await Promise.all([
    supabase.from("matches").select("*").eq("id", id).single(),
    supabase
      .from("league_members")
      .select("league_id, leagues(*)")
      .eq("user_id", user!.id),
  ])

  if (!matchRes.data) notFound()
  const match = matchRes.data as Match

  const myLeagues = (leaguesRes.data ?? []) as unknown as Array<{
    league_id: string
    leagues: {
      id: string
      name: string
      banner_color: string
      config: {
        advancedOptions: {
          enabled: boolean
          firstScorer: boolean
          goalMinute: boolean
          yellowCards: boolean
          redCards: boolean
          corners: boolean
          firstTeamToScore: boolean
          halftimeResult: boolean
        }
      }
    } | null
  }>

  const validLeagues = myLeagues.filter((l) => l.leagues !== null).map((l) => l.leagues!)

  // Predicciones existentes del usuario para este partido
  const { data: existingPredsData } = await supabase
    .from("predictions")
    .select("*")
    .eq("user_id", user!.id)
    .eq("match_id", id)

  const existingPreds = (existingPredsData ?? []) as Array<{
    league_id: string
    home_score_pred: number
    away_score_pred: number
    advanced_picks: Record<string, unknown>
    points_wagered: number
    wildcard_used: string | null
  }>

  const isLocked = match.status !== "scheduled" || new Date(match.scheduled_at) <= new Date()

  return (
    <main className="max-w-2xl mx-auto px-4 md:px-8 py-8">
      <Link
        href="/partidos"
        className="inline-flex items-center gap-2 text-gray-500 hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Volver
      </Link>

      {/* Header del partido */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 mb-6">
        <div className="text-center mb-2">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            {match.stage}
          </span>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <Link href={`/equipos/${match.home_team_code}`} className="text-center group">
            <div className="mb-2 flex justify-center">
              <TeamFlag code={match.home_team_code} size={64} className="group-hover:scale-105 transition-transform" />
            </div>
            <p className="text-white font-bold group-hover:text-green-400 transition-colors">{match.home_team}</p>
          </Link>
          <div className="text-center">
            {match.status === "scheduled" ? (
              <span className="text-2xl text-gray-500 font-light">vs</span>
            ) : (
              <span className="text-3xl text-white font-black">
                {match.home_score ?? 0} - {match.away_score ?? 0}
              </span>
            )}
          </div>
          <Link href={`/equipos/${match.away_team_code}`} className="text-center group">
            <div className="mb-2 flex justify-center">
              <TeamFlag code={match.away_team_code} size={64} className="group-hover:scale-105 transition-transform" />
            </div>
            <p className="text-white font-bold group-hover:text-green-400 transition-colors">{match.away_team}</p>
          </Link>
        </div>
        <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-500 flex-wrap">
          <span className="flex items-center gap-1">
            <Clock size={12} />
            <LocalDateTime date={match.scheduled_at} formatStr="EEEE d 'de' MMMM · HH:mm" showTz />
          </span>
          {match.venue && (
            <span className="flex items-center gap-1">
              <MapPin size={12} />
              {match.venue}
            </span>
          )}
        </div>
      </div>

      {/* Formulario de predicción */}
      {validLeagues.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <p className="text-gray-400 mb-2">No estás en ninguna liga todavía</p>
          <Link
            href="/ligas/crear"
            className="text-green-400 hover:text-green-300 text-sm font-medium"
          >
            Crear una liga →
          </Link>
        </div>
      ) : (
        <PredictionForm
          match={match}
          leagues={validLeagues}
          existingPreds={existingPreds}
          isLocked={isLocked}
        />
      )}

      {/* Feed social — solo cuando ya cerró el pronóstico */}
      {isLocked && validLeagues.length > 0 && (
        <section className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <Users size={18} className="text-blue-400" />
            <h2 className="text-lg font-bold text-white">Predicciones de tu liga</h2>
          </div>

          {validLeagues.length > 1 ? (
            <div className="space-y-6">
              {validLeagues.map((league) => (
                <div key={league.id}>
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: league.banner_color }}
                    />
                    <h3 className="text-sm font-bold text-gray-400">{league.name}</h3>
                  </div>
                  <PredictionsSocialFeed
                    matchId={match.id}
                    leagueId={league.id}
                    currentUserId={user!.id}
                    homeCode={match.home_team_code}
                    awayCode={match.away_team_code}
                    homeScore={match.home_score}
                    awayScore={match.away_score}
                    matchFinished={match.status === "finished"}
                  />
                </div>
              ))}
            </div>
          ) : (
            <PredictionsSocialFeed
              matchId={match.id}
              leagueId={validLeagues[0].id}
              currentUserId={user!.id}
              homeCode={match.home_team_code}
              awayCode={match.away_team_code}
              homeScore={match.home_score}
              awayScore={match.away_score}
              matchFinished={match.status === "finished"}
            />
          )}
        </section>
      )}
    </main>
  )
}

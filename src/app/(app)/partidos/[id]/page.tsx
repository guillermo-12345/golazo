import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { ArrowLeft, Clock, MapPin, Users } from "lucide-react"
import Link from "next/link"
import type { Match } from "@/types/database"
import PredictionForm from "@/components/predictions/PredictionForm"
import PredictionsSocialFeed from "@/components/predictions/PredictionsSocialFeed"
import MatchPredictionStats from "@/components/predictions/MatchPredictionStats"
import TeamFlag from "@/components/TeamFlag"
import LocalDateTime from "@/components/LocalDateTime"
import ShareButton from "@/components/ShareButton"
import LiveScore from "@/components/matches/LiveScore"
import LiveMatchScoreboard from "@/components/matches/LiveMatchScoreboard"
import MatchEvents from "@/components/matches/MatchEvents"
import MatchStatistics from "@/components/matches/MatchStatistics"
import { isPredictionLocked } from "@/lib/predictions"

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
      .select("league_id, joined_at, leagues(*)")
      .eq("user_id", user!.id)
      .order("joined_at", { ascending: true }),
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
          possession?: boolean
          totalShots?: boolean
          totalFouls?: boolean
        }
        allowWildcards?: boolean
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

  // Cierra PREDICTION_LOCK_MINUTES antes del kickoff (también validado por RLS)
  const isLocked = isPredictionLocked(match.scheduled_at, match.status)

  return (
    <main className="max-w-2xl mx-auto px-4 md:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/partidos"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-white text-sm transition-colors"
        >
          <ArrowLeft size={16} />
          Volver
        </Link>
        <ShareButton
          title={`${match.home_team} vs ${match.away_team}`}
          text={`${match.home_team} vs ${match.away_team} - Mundial 2026. ¡Predecí el resultado en Golazo!`}
          variant="compact"
        />
      </div>

      {/* Header del partido */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 mb-6">
        <div className="text-center mb-2">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            {match.stage}
          </span>
        </div>
        <LiveScore initialMatch={match} />
        <LiveMatchScoreboard initialMatch={match} />
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

      {/* Stats de predicciones — solo visible si ya predijiste o el partido cerró */}
      {validLeagues.length > 0 && (existingPreds.length > 0 || isLocked) && (
        <section className="mt-6">
          <MatchPredictionStats
            matchId={match.id}
            leagueId={validLeagues[0].id}
            homeCode={match.home_team_code}
            awayCode={match.away_team_code}
            homeName={match.home_team}
            awayName={match.away_team}
          />
        </section>
      )}

      {/* Stats del partido y eventos — solo cuando ya termino */}
      {match.status === "finished" && match.extra_data && (() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const extra = match.extra_data as any
        const hasEvents = Array.isArray(extra.events) && extra.events.length > 0
        const hasStats = Array.isArray(extra.statistics) && extra.statistics.length > 0
        if (!hasEvents && !hasStats) return null
        return (
          <div className="mt-8 space-y-6">
            {hasStats && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Users size={18} className="text-green-400" />
                  <h2 className="text-lg font-bold text-white">Estadísticas del partido</h2>
                </div>
                <MatchStatistics
                  statistics={extra.statistics}
                  homeTeam={match.home_team}
                  homeCode={match.home_team_code}
                  awayCode={match.away_team_code}
                />
              </section>
            )}
            {hasEvents && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Users size={18} className="text-yellow-400" />
                  <h2 className="text-lg font-bold text-white">Eventos del partido</h2>
                </div>
                <MatchEvents
                  events={extra.events}
                  homeTeam={match.home_team}
                  homeCode={match.home_team_code}
                  awayCode={match.away_team_code}
                />
              </section>
            )}
          </div>
        )
      })()}

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

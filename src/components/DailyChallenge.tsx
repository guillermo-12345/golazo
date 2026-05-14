"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Zap, Check, CalendarDays, Trophy } from "lucide-react"
import Link from "next/link"
import TeamFlag from "@/components/TeamFlag"
import LocalDateTime from "@/components/LocalDateTime"

type TodayMatch = {
  id: string
  home_team: string
  away_team: string
  home_team_code: string
  away_team_code: string
  scheduled_at: string
  hasPrediction: boolean
}

type ChallengeStatus = {
  todayMatches: TodayMatch[]
  predictedCount: number
  totalCount: number
  alreadyRewarded: boolean
  loading: boolean
}

export default function DailyChallenge() {
  const [status, setStatus] = useState<ChallengeStatus>({
    todayMatches: [],
    predictedCount: 0,
    totalCount: 0,
    alreadyRewarded: false,
    loading: true,
  })
  const [justCompleted, setJustCompleted] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Partidos de hoy (en UTC, mismo criterio que la RPC)
      const today = new Date()
      const todayStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
      const todayEnd = new Date(todayStart)
      todayEnd.setUTCDate(todayEnd.getUTCDate() + 1)

      const { data: matchesData } = await supabase
        .from("matches")
        .select("id, home_team, away_team, home_team_code, away_team_code, scheduled_at")
        .gte("scheduled_at", todayStart.toISOString())
        .lt("scheduled_at", todayEnd.toISOString())
        .order("scheduled_at", { ascending: true })

      const matches = (matchesData ?? []) as Array<{
        id: string
        home_team: string
        away_team: string
        home_team_code: string
        away_team_code: string
        scheduled_at: string
      }>

      if (matches.length === 0) {
        setStatus({
          todayMatches: [],
          predictedCount: 0,
          totalCount: 0,
          alreadyRewarded: false,
          loading: false,
        })
        return
      }

      // Predicciones del usuario para esos partidos (distinct match_id)
      const matchIds = matches.map((m) => m.id)
      const { data: predsData } = await supabase
        .from("predictions")
        .select("match_id")
        .eq("user_id", user.id)
        .in("match_id", matchIds)

      const predicted = new Set((predsData ?? []).map((p) => (p as { match_id: string }).match_id))

      // Estado del challenge en DB
      const dateStr = todayStart.toISOString().slice(0, 10)
      const { data: challengeData } = await supabase
        .from("daily_challenges")
        .select("reward_given")
        .eq("user_id", user.id)
        .eq("challenge_date", dateStr)
        .maybeSingle()

      const alreadyRewarded = (challengeData as { reward_given?: boolean } | null)?.reward_given ?? false

      const todayMatches = matches.map((m) => ({
        ...m,
        hasPrediction: predicted.has(m.id),
      }))

      setStatus({
        todayMatches,
        predictedCount: predicted.size,
        totalCount: matches.length,
        alreadyRewarded,
        loading: false,
      })

      // Si tiene todas las predicciones hechas y aún no le dimos el premio, otorgar
      if (predicted.size === matches.length && !alreadyRewarded) {
        const { data: result } = await supabase.rpc("complete_daily_challenge", { p_date: dateStr })
        const r = result as { reward_given?: boolean; bonus_points?: number } | null
        if (r?.reward_given) {
          setJustCompleted(true)
          setStatus((s) => ({ ...s, alreadyRewarded: true }))
        }
      }
    }

    load()
  }, [])

  if (status.loading) return null

  // Si no hay partidos hoy, ocultar
  if (status.totalCount === 0) return null

  const pct = Math.round((status.predictedCount / status.totalCount) * 100)
  const isComplete = status.predictedCount === status.totalCount

  return (
    <section className="mb-8">
      <div
        className={`bg-gradient-to-br rounded-2xl p-5 border ${
          isComplete
            ? "from-yellow-500/15 to-orange-500/5 border-yellow-500/30"
            : "from-purple-500/10 to-pink-500/5 border-purple-500/20"
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap size={18} className={isComplete ? "text-yellow-400" : "text-purple-400"} />
            <h3 className="text-white font-bold">Desafío diario</h3>
          </div>
          {status.alreadyRewarded && (
            <div className="flex items-center gap-1 bg-yellow-500/20 border border-yellow-500/40 rounded-full px-2.5 py-1">
              <Trophy size={12} className="text-yellow-300" />
              <span className="text-yellow-300 text-xs font-bold">+10 pts ganados</span>
            </div>
          )}
        </div>

        {/* Mensaje */}
        <p className="text-sm text-gray-300 mb-3">
          {justCompleted ? (
            <span className="text-yellow-300 font-bold">🎉 ¡Completaste el desafío! +10 puntos bonus en todas tus ligas.</span>
          ) : status.alreadyRewarded ? (
            <span>Ya completaste el desafío de hoy. ¡Volvé mañana!</span>
          ) : isComplete ? (
            <span className="text-yellow-300">¡Predijiste todos los partidos del día!</span>
          ) : (
            <span>
              Predecí los <span className="text-white font-bold">{status.totalCount} partidos de hoy</span> y ganá{" "}
              <span className="text-yellow-400 font-bold">+10 puntos bonus</span> en todas tus ligas.
            </span>
          )}
        </p>

        {/* Barra de progreso */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                isComplete
                  ? "bg-gradient-to-r from-yellow-500 to-orange-500"
                  : "bg-gradient-to-r from-purple-500 to-pink-500"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-white text-sm font-bold tabular-nums">
            {status.predictedCount}/{status.totalCount}
          </span>
        </div>

        {/* Lista de partidos del día */}
        <div className="space-y-1.5">
          {status.todayMatches.map((m) => (
            <Link
              key={m.id}
              href={`/partidos/${m.id}`}
              className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                m.hasPrediction ? "bg-green-500/5" : "hover:bg-white/5"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  m.hasPrediction
                    ? "bg-green-500 border-green-500"
                    : "bg-white/5 border-white/20"
                }`}
              >
                {m.hasPrediction && <Check size={12} className="text-black" strokeWidth={3} />}
              </div>
              <TeamFlag code={m.home_team_code} size={20} />
              <span className="text-gray-300 text-xs">vs</span>
              <TeamFlag code={m.away_team_code} size={20} />
              <span className="text-white text-xs font-medium flex-1 truncate">
                {m.home_team_code} - {m.away_team_code}
              </span>
              <LocalDateTime date={m.scheduled_at} formatStr="HH:mm" className="text-gray-500 text-[10px] font-mono" />
            </Link>
          ))}
        </div>

        {!isComplete && (
          <p className="text-center mt-3">
            <Link
              href="/calendario"
              className="text-purple-400 hover:text-purple-300 text-xs font-medium"
            >
              Ir a los partidos →
            </Link>
          </p>
        )}
      </div>
    </section>
  )
}

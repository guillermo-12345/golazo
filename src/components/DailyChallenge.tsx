"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Zap, Check, X, Clock, Target, Crosshair, ListChecks } from "lucide-react"
import Link from "next/link"
import TeamFlag from "@/components/TeamFlag"
import LocalDateTime from "@/components/LocalDateTime"
import { DAILY_CHALLENGE_POINTS } from "@/lib/scoring-values"

type TodayMatch = {
  id: string
  home_team_code: string
  away_team_code: string
  scheduled_at: string
  status: string
  home_score: number | null
  away_score: number | null
  hasPrediction: boolean
  /** null si el partido no terminó o no predijo */
  hit1x2: boolean | null
  hitExact: boolean | null
}

type State = {
  matches: TodayMatch[]
  predictedCount: number
  finishedCount: number
  /* nivel 1 */
  participationDone: boolean
  /* niveles 2 y 3 (tras verificación) */
  resultsChecked: boolean
  skillWon: boolean
  exactWon: boolean
  loading: boolean
}

export default function DailyChallenge() {
  const [s, setS] = useState<State>({
    matches: [],
    predictedCount: 0,
    finishedCount: 0,
    participationDone: false,
    resultsChecked: false,
    skillWon: false,
    exactWon: false,
    loading: true,
  })

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Día en UTC — mismo criterio que las funciones SQL
      const now = new Date()
      const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
      const dayEnd = new Date(dayStart)
      dayEnd.setUTCDate(dayEnd.getUTCDate() + 1)
      const dateStr = dayStart.toISOString().slice(0, 10)

      const { data: matchesData } = await supabase
        .from("matches")
        .select("id, home_team_code, away_team_code, scheduled_at, status, home_score, away_score")
        .gte("scheduled_at", dayStart.toISOString())
        .lt("scheduled_at", dayEnd.toISOString())
        .order("scheduled_at", { ascending: true })

      const matches = (matchesData ?? []) as Array<Omit<TodayMatch, "hasPrediction" | "hit1x2" | "hitExact">>
      if (matches.length === 0) {
        setS((prev) => ({ ...prev, loading: false }))
        return
      }

      const { data: predsData } = await supabase
        .from("predictions")
        .select("match_id, home_score_pred, away_score_pred")
        .eq("user_id", user.id)
        .in("match_id", matches.map((m) => m.id))

      const preds = (predsData ?? []) as Array<{
        match_id: string
        home_score_pred: number
        away_score_pred: number
      }>
      const predsByMatch = new Map<string, typeof preds>()
      for (const p of preds) {
        const list = predsByMatch.get(p.match_id) ?? []
        list.push(p)
        predsByMatch.set(p.match_id, list)
      }

      // Estado de aciertos por partido (si predijo en varias ligas, vale si alguna pegó)
      const withState: TodayMatch[] = matches.map((m) => {
        const mPreds = predsByMatch.get(m.id) ?? []
        const finished = m.status === "finished" && m.home_score !== null && m.away_score !== null
        let hit1x2: boolean | null = null
        let hitExact: boolean | null = null
        if (finished && mPreds.length > 0) {
          hit1x2 = mPreds.some(
            (p) =>
              (p.home_score_pred > p.away_score_pred && m.home_score! > m.away_score!) ||
              (p.home_score_pred < p.away_score_pred && m.home_score! < m.away_score!) ||
              (p.home_score_pred === p.away_score_pred && m.home_score === m.away_score)
          )
          hitExact = mPreds.some(
            (p) => p.home_score_pred === m.home_score && p.away_score_pred === m.away_score
          )
        }
        return { ...m, hasPrediction: mPreds.length > 0, hit1x2, hitExact }
      })

      const predictedCount = withState.filter((m) => m.hasPrediction).length
      const finishedCount = withState.filter((m) => m.status === "finished").length

      // Estado del desafío en DB
      const { data: dcData } = await supabase
        .from("daily_challenges")
        .select("reward_given, results_checked, skill_reward_given, exact_reward_given")
        .eq("user_id", user.id)
        .eq("challenge_date", dateStr)
        .maybeSingle()

      const dc = dcData as {
        reward_given?: boolean
        results_checked?: boolean
        skill_reward_given?: boolean
        exact_reward_given?: boolean
      } | null

      let participationDone = dc?.reward_given ?? false
      let resultsChecked = dc?.results_checked ?? false
      let skillWon = dc?.skill_reward_given ?? false
      let exactWon = dc?.exact_reward_given ?? false

      // Nivel 1: reclamar si predijo todo y no cobró
      if (predictedCount === matches.length && !participationDone) {
        const { data } = await supabase.rpc("complete_daily_challenge", { p_date: dateStr })
        if ((data as { reward_given?: boolean } | null)?.reward_given) participationDone = true
      }

      // Niveles 2 y 3: reclamar cuando terminó todo el día
      if (finishedCount === matches.length && !resultsChecked) {
        const { data } = await supabase.rpc("claim_daily_challenge_results", { p_date: dateStr })
        const r = data as { checked?: boolean; skill_won?: boolean; exact_won?: boolean } | null
        if (r?.checked) {
          resultsChecked = true
          skillWon = r.skill_won ?? false
          exactWon = r.exact_won ?? false
        }
      }

      setS({
        matches: withState,
        predictedCount,
        finishedCount,
        participationDone,
        resultsChecked,
        skillWon,
        exactWon,
        loading: false,
      })
    }

    load()
  }, [])

  if (s.loading || s.matches.length === 0) return null

  const total = s.matches.length
  const target = Math.ceil(total / 2)
  const wins = s.matches.filter((m) => m.hit1x2).length
  const exacts = s.matches.filter((m) => m.hitExact).length
  const allFinished = s.finishedCount === total
  const totalWon =
    (s.participationDone ? DAILY_CHALLENGE_POINTS.participate : 0) +
    (s.skillWon ? DAILY_CHALLENGE_POINTS.accuracy : 0) +
    (s.exactWon ? DAILY_CHALLENGE_POINTS.sniper : 0)

  return (
    <section className="mb-8">
      <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/5 border border-purple-500/20 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-purple-400" />
            <h3 className="text-white font-bold">Desafío diario</h3>
          </div>
          {totalWon > 0 && (
            <span className="bg-yellow-500/20 border border-yellow-500/40 rounded-full px-2.5 py-1 text-yellow-300 text-xs font-bold">
              +{totalWon} pts hoy
            </span>
          )}
        </div>

        {/* Niveles */}
        <div className="space-y-2 mb-4">
          <TierRow
            icon={ListChecks}
            title={`Participá: predecí los ${total} partidos de hoy`}
            pts={DAILY_CHALLENGE_POINTS.participate}
            state={
              s.participationDone
                ? "won"
                : s.predictedCount === total
                ? "won"
                : "open"
            }
            progress={`${s.predictedCount}/${total}`}
          />
          <TierRow
            icon={Target}
            title={`Puntería: acertá el resultado en ${target} de ${total}`}
            pts={DAILY_CHALLENGE_POINTS.accuracy}
            state={
              s.skillWon ? "won" : s.resultsChecked ? "lost" : allFinished ? "open" : "playing"
            }
            progress={s.finishedCount > 0 ? `${wins} acertado${wins === 1 ? "" : "s"}` : undefined}
          />
          <TierRow
            icon={Crosshair}
            title="Francotirador: clavá un resultado exacto"
            pts={DAILY_CHALLENGE_POINTS.sniper}
            state={
              s.exactWon ? "won" : s.resultsChecked ? "lost" : allFinished ? "open" : "playing"
            }
            progress={s.finishedCount > 0 && exacts > 0 ? `${exacts} exacto${exacts === 1 ? "" : "s"}` : undefined}
          />
        </div>

        {/* Lista de partidos del día */}
        <div className="space-y-1.5">
          {s.matches.map((m) => (
            <Link
              key={m.id}
              href={`/partidos/${m.id}`}
              className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                m.hasPrediction ? "bg-green-500/5" : "hover:bg-white/5"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  m.hitExact
                    ? "bg-yellow-500 border-yellow-500"
                    : m.hit1x2
                    ? "bg-green-500 border-green-500"
                    : m.hit1x2 === false
                    ? "bg-red-500/30 border-red-500/50"
                    : m.hasPrediction
                    ? "bg-green-500/30 border-green-500/60"
                    : "bg-white/5 border-white/20"
                }`}
              >
                {m.hitExact ? (
                  <Crosshair size={11} className="text-black" strokeWidth={3} />
                ) : m.hit1x2 ? (
                  <Check size={12} className="text-black" strokeWidth={3} />
                ) : m.hit1x2 === false ? (
                  <X size={11} className="text-red-300" strokeWidth={3} />
                ) : m.hasPrediction ? (
                  <Check size={12} className="text-green-200" strokeWidth={3} />
                ) : null}
              </div>
              <TeamFlag code={m.home_team_code} size={20} />
              <span className="text-gray-300 text-xs">vs</span>
              <TeamFlag code={m.away_team_code} size={20} />
              <span className="text-white text-xs font-medium flex-1 truncate">
                {m.home_team_code} - {m.away_team_code}
              </span>
              {m.status === "finished" ? (
                <span className="text-gray-400 text-[10px] font-mono tabular-nums">
                  {m.home_score}-{m.away_score}
                </span>
              ) : (
                <LocalDateTime
                  date={m.scheduled_at}
                  formatStr="HH:mm"
                  className="text-gray-500 text-[10px] font-mono"
                />
              )}
            </Link>
          ))}
        </div>

        {s.predictedCount < total && (
          <p className="text-center mt-3">
            <Link href="/calendario" className="text-purple-400 hover:text-purple-300 text-xs font-medium">
              Completar predicciones →
            </Link>
          </p>
        )}
      </div>
    </section>
  )
}

function TierRow({
  icon: Icon,
  title,
  pts,
  state,
  progress,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  title: string
  pts: number
  state: "won" | "lost" | "playing" | "open"
  progress?: string
}) {
  return (
    <div
      className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 ${
        state === "won"
          ? "bg-yellow-500/10 border-yellow-500/30"
          : state === "lost"
          ? "bg-white/[0.02] border-white/5 opacity-60"
          : "bg-white/5 border-white/10"
      }`}
    >
      <Icon size={15} className={state === "won" ? "text-yellow-400" : "text-purple-400"} />
      <p className="flex-1 text-xs text-gray-300 leading-snug">{title}</p>
      {progress && state !== "won" && state !== "lost" && (
        <span className="text-gray-500 text-[10px] tabular-nums">{progress}</span>
      )}
      {state === "won" ? (
        <span className="text-yellow-300 text-xs font-bold whitespace-nowrap">✓ +{pts}</span>
      ) : state === "lost" ? (
        <span className="text-gray-600 text-xs whitespace-nowrap">✗ no salió</span>
      ) : state === "playing" ? (
        <span className="flex items-center gap-1 text-gray-500 text-[10px] whitespace-nowrap">
          <Clock size={10} /> +{pts}
        </span>
      ) : (
        <span className="text-purple-300 text-xs font-bold whitespace-nowrap">+{pts}</span>
      )}
    </div>
  )
}

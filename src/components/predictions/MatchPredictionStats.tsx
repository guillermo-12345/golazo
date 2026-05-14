"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { TrendingUp, BarChart3, Loader2 } from "lucide-react"
import TeamFlag from "@/components/TeamFlag"

type Stats = {
  total: number
  homeWins: number
  draws: number
  awayWins: number
  topScores: Array<{ score: string; count: number }>
}

type Props = {
  matchId: string
  leagueId: string
  homeCode: string
  awayCode: string
  homeName: string
  awayName: string
}

export default function MatchPredictionStats({
  matchId,
  leagueId,
  homeCode,
  awayCode,
  homeName,
  awayName,
}: Props) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from("predictions")
        .select("home_score_pred, away_score_pred")
        .eq("match_id", matchId)
        .eq("league_id", leagueId)

      const preds = (data ?? []) as Array<{ home_score_pred: number; away_score_pred: number }>

      let homeWins = 0
      let draws = 0
      let awayWins = 0
      const scoreCount = new Map<string, number>()

      for (const p of preds) {
        if (p.home_score_pred > p.away_score_pred) homeWins++
        else if (p.home_score_pred < p.away_score_pred) awayWins++
        else draws++

        const key = `${p.home_score_pred}-${p.away_score_pred}`
        scoreCount.set(key, (scoreCount.get(key) ?? 0) + 1)
      }

      const topScores = Array.from(scoreCount.entries())
        .map(([score, count]) => ({ score, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)

      setStats({
        total: preds.length,
        homeWins,
        draws,
        awayWins,
        topScores,
      })
      setLoading(false)
    }

    load()
  }, [matchId, leagueId])

  if (loading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex justify-center">
        <Loader2 size={20} className="text-gray-500 animate-spin" />
      </div>
    )
  }

  if (!stats || stats.total === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
        <BarChart3 size={24} className="text-gray-600 mx-auto mb-2" />
        <p className="text-gray-500 text-sm">Aún no hay predicciones en tu liga</p>
      </div>
    )
  }

  const homePct = Math.round((stats.homeWins / stats.total) * 100)
  const drawPct = Math.round((stats.draws / stats.total) * 100)
  const awayPct = Math.round((stats.awayWins / stats.total) * 100)

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-blue-400" />
          <h3 className="text-white font-bold text-sm">Lo que predijo tu liga</h3>
        </div>
        <span className="text-xs text-gray-500">{stats.total} {stats.total === 1 ? "predicción" : "predicciones"}</span>
      </div>

      {/* Barra de % por resultado */}
      <div className="space-y-2 mb-4">
        <PercentBar
          icon={<TeamFlag code={homeCode} size={20} />}
          label={`Gana ${homeName}`}
          pct={homePct}
          count={stats.homeWins}
          color="bg-green-500"
        />
        <PercentBar
          icon={<span className="text-base">🤝</span>}
          label="Empate"
          pct={drawPct}
          count={stats.draws}
          color="bg-yellow-500"
        />
        <PercentBar
          icon={<TeamFlag code={awayCode} size={20} />}
          label={`Gana ${awayName}`}
          pct={awayPct}
          count={stats.awayWins}
          color="bg-blue-500"
        />
      </div>

      {/* Top 3 scores predichos */}
      {stats.topScores.length > 0 && (
        <div className="pt-4 border-t border-white/10">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Resultados más predichos</p>
          <div className="flex gap-2 flex-wrap">
            {stats.topScores.map((s, idx) => {
              const pct = Math.round((s.count / stats.total) * 100)
              return (
                <div
                  key={s.score}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${
                    idx === 0
                      ? "bg-green-500/10 border-green-500/30 text-green-300"
                      : "bg-white/5 border-white/10 text-gray-300"
                  }`}
                >
                  <span className="font-mono font-bold text-sm">{s.score}</span>
                  <span className="text-xs text-gray-500">· {pct}%</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function PercentBar({
  icon,
  label,
  pct,
  count,
  color,
}: {
  icon: React.ReactNode
  label: string
  pct: number
  count: number
  color: string
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1 text-sm">
        {icon}
        <span className="text-gray-300 flex-1 truncate">{label}</span>
        <span className="text-white font-bold tabular-nums">{pct}%</span>
        <span className="text-gray-600 text-xs tabular-nums">({count})</span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

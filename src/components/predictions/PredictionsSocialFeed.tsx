"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import Avatar from "@/components/Avatar"
import { Loader2, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

type Prediction = {
  id: string
  user_id: string
  home_score_pred: number
  away_score_pred: number
  wildcard_used: string | null
  profiles: {
    username: string
    display_name: string
    avatar_config: unknown
  } | null
}

type Reaction = {
  id: string
  user_id: string
  prediction_id: string
  emoji: string
}

const REACTIONS = ["🔥", "👏", "🤣", "🤔", "🎯", "💀"]

const WILDCARD_LABEL: Record<string, { label: string; color: string }> = {
  todo_o_nada: { label: "Todo o Nada", color: "text-red-400" },
  escudo: { label: "Escudo", color: "text-blue-400" },
  ladron: { label: "Ladrón", color: "text-purple-400" },
}

type Props = {
  matchId: string
  leagueId: string
  currentUserId: string
  homeCode: string
  awayCode: string
  homeScore: number | null
  awayScore: number | null
  matchFinished: boolean
}

export default function PredictionsSocialFeed({
  matchId,
  leagueId,
  currentUserId,
  homeCode,
  awayCode,
  homeScore,
  awayScore,
  matchFinished,
}: Props) {
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    let mounted = true
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let channel: any = null

    async function init() {
      const [predsRes, reactsRes] = await Promise.all([
        supabase
          .from("predictions")
          .select(
            "id, user_id, home_score_pred, away_score_pred, wildcard_used, profiles(username, display_name, avatar_config)"
          )
          .eq("match_id", matchId)
          .eq("league_id", leagueId),
        supabase
          .from("reactions")
          .select("id, user_id, prediction_id, emoji")
          .in(
            "prediction_id",
            ((await supabase.from("predictions").select("id").eq("match_id", matchId).eq("league_id", leagueId)).data ?? []).map(
              (p) => (p as { id: string }).id
            )
          ),
      ])

      if (!mounted) return
      setPredictions((predsRes.data ?? []) as unknown as Prediction[])
      setReactions((reactsRes.data ?? []) as Reaction[])
      setLoading(false)

      // Realtime para nuevas reacciones
      channel = supabase
        .channel(`reactions-${matchId}-${leagueId}-${Date.now()}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "reactions" },
          async () => {
            const { data } = await supabase
              .from("reactions")
              .select("id, user_id, prediction_id, emoji")
              .in(
                "prediction_id",
                ((await supabase.from("predictions").select("id").eq("match_id", matchId).eq("league_id", leagueId)).data ?? []).map(
                  (p) => (p as { id: string }).id
                )
              )
            if (mounted) setReactions((data ?? []) as Reaction[])
          }
        )
        .subscribe()
    }

    init()

    return () => {
      mounted = false
      if (channel) supabase.removeChannel(channel)
    }
  }, [matchId, leagueId])

  async function toggleReaction(predictionId: string, emoji: string) {
    const supabase = createClient()
    const existing = reactions.find(
      (r) => r.prediction_id === predictionId && r.user_id === currentUserId
    )

    if (existing && existing.emoji === emoji) {
      // Remover
      await supabase.from("reactions").delete().eq("id", existing.id)
      setReactions((prev) => prev.filter((r) => r.id !== existing.id))
    } else if (existing) {
      // Cambiar emoji
      await supabase.from("reactions").delete().eq("id", existing.id)
      const { data } = await supabase
        .from("reactions")
        .insert({ user_id: currentUserId, prediction_id: predictionId, emoji })
        .select()
        .single()
      if (data) {
        setReactions((prev) => [...prev.filter((r) => r.id !== existing.id), data as Reaction])
      }
    } else {
      // Crear nueva
      const { data } = await supabase
        .from("reactions")
        .insert({ user_id: currentUserId, prediction_id: predictionId, emoji })
        .select()
        .single()
      if (data) setReactions((prev) => [...prev, data as Reaction])
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 size={20} className="text-green-500 animate-spin" />
      </div>
    )
  }

  if (predictions.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
        <p className="text-gray-500 text-sm">Nadie de tu liga predijo este partido todavía</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {predictions.map((pred) => {
        const isMe = pred.user_id === currentUserId
        const myReaction = reactions.find(
          (r) => r.prediction_id === pred.id && r.user_id === currentUserId
        )
        const predReactions = reactions.filter((r) => r.prediction_id === pred.id)

        // Agrupar reacciones por emoji
        const reactionCounts = predReactions.reduce<Record<string, number>>((acc, r) => {
          acc[r.emoji] = (acc[r.emoji] || 0) + 1
          return acc
        }, {})

        // ¿Acertó? (solo si terminó el partido)
        const acerto =
          matchFinished &&
          homeScore !== null &&
          awayScore !== null &&
          pred.home_score_pred === homeScore &&
          pred.away_score_pred === awayScore

        const wcMeta = pred.wildcard_used ? WILDCARD_LABEL[pred.wildcard_used] : null

        return (
          <div
            key={pred.id}
            className={cn(
              "bg-white/5 border rounded-2xl p-4 transition-colors",
              acerto ? "border-green-500/40 bg-green-500/5" : "border-white/10",
              isMe && !acerto && "border-white/20"
            )}
          >
            <div className="flex items-center gap-3 mb-3">
              <Avatar
                config={pred.profiles?.avatar_config}
                username={pred.profiles?.username}
                size={36}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-white font-semibold text-sm truncate">
                    {pred.profiles?.display_name}
                  </p>
                  {isMe && <span className="text-green-400 text-xs">(vos)</span>}
                  {acerto && <span className="text-green-400 text-xs font-bold">✓ Acertó</span>}
                </div>
                <p className="text-gray-600 text-xs">@{pred.profiles?.username}</p>
              </div>

              {/* Score */}
              <div className="flex items-center gap-2 bg-black/30 rounded-xl px-3 py-1.5 border border-white/10">
                <span className="text-gray-500 text-xs">{homeCode}</span>
                <span className="text-white font-black text-lg">
                  {pred.home_score_pred}-{pred.away_score_pred}
                </span>
                <span className="text-gray-500 text-xs">{awayCode}</span>
              </div>
            </div>

            {wcMeta && (
              <div className="flex items-center gap-1.5 mb-3 text-xs">
                <Sparkles size={11} className={wcMeta.color} />
                <span className={wcMeta.color}>{wcMeta.label}</span>
              </div>
            )}

            {/* Reactions */}
            {!isMe && (
              <div className="flex flex-wrap items-center gap-1.5">
                {REACTIONS.map((emoji) => {
                  const count = reactionCounts[emoji] || 0
                  const mine = myReaction?.emoji === emoji
                  return (
                    <button
                      key={emoji}
                      onClick={() => toggleReaction(pred.id, emoji)}
                      className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded-full border text-xs transition-all",
                        mine
                          ? "bg-green-500/20 border-green-500/50"
                          : count > 0
                          ? "bg-white/10 border-white/15 hover:border-white/30"
                          : "bg-transparent border-white/10 hover:border-white/20 hover:bg-white/5"
                      )}
                    >
                      <span>{emoji}</span>
                      {count > 0 && (
                        <span className={cn("font-bold", mine ? "text-green-400" : "text-gray-400")}>
                          {count}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Mostrar reacciones recibidas para tu propia predicción */}
            {isMe && Object.keys(reactionCounts).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(reactionCounts).map(([emoji, count]) => (
                  <div
                    key={emoji}
                    className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 border border-white/15 text-xs"
                  >
                    <span>{emoji}</span>
                    <span className="text-gray-400 font-bold">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

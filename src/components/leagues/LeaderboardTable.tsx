"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import Avatar from "@/components/Avatar"
import TeamFlag from "@/components/TeamFlag"
import { Crown, TrendingUp, TrendingDown, ChevronDown, Loader2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

type Member = {
  user_id: string
  points: number
  rank: number | null
  joined_at: string
  profiles: {
    username: string
    display_name: string
    avatar_config: unknown
  } | null
}

type HistoryRow = {
  home_score_pred: number
  away_score_pred: number
  points_earned: number | null
  matches: {
    home_team_code: string
    away_team_code: string
    home_score: number | null
    away_score: number | null
    scheduled_at: string
  } | null
}

type Props = {
  leagueId: string
  initialMembers: Member[]
  currentUserId: string
}

export default function LeaderboardTable({ leagueId, initialMembers, currentUserId }: Props) {
  const [members, setMembers] = useState<Member[]>(initialMembers)
  const [previousRanks, setPreviousRanks] = useState<Map<string, number | null>>(
    new Map(initialMembers.map((m) => [m.user_id, m.rank]))
  )

  // Desplegable de historial por jugador
  const [expanded, setExpanded] = useState<string | null>(null)
  const [history, setHistory] = useState<Map<string, HistoryRow[]>>(new Map())
  const [loadingHistory, setLoadingHistory] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    let mounted = true
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let channel: any = null

    async function refetch() {
      const { data } = await supabase
        .from("league_members")
        .select("user_id, points, rank, joined_at, profiles(username, display_name, avatar_config)")
        .eq("league_id", leagueId)
        .order("points", { ascending: false })

      if (!mounted) return
      const newMembers = (data ?? []) as unknown as Member[]
      setPreviousRanks((prev) => {
        const next = new Map(prev)
        members.forEach((m) => next.set(m.user_id, m.rank))
        return next
      })
      setMembers(newMembers)
    }

    channel = supabase
      .channel(`leaderboard-${leagueId}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "league_members",
          filter: `league_id=eq.${leagueId}`,
        },
        () => refetch()
      )
      .subscribe()

    return () => {
      mounted = false
      if (channel) supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId])

  async function toggleExpand(userId: string) {
    if (expanded === userId) {
      setExpanded(null)
      return
    }
    setExpanded(userId)
    if (!history.has(userId)) {
      setLoadingHistory(true)
      const supabase = createClient()
      // Solo partidos TERMINADOS: no revela predicciones de partidos futuros
      const { data } = await supabase
        .from("predictions")
        .select(
          "home_score_pred, away_score_pred, points_earned, matches!inner(home_team_code, away_team_code, home_score, away_score, scheduled_at, status)"
        )
        .eq("league_id", leagueId)
        .eq("user_id", userId)
        .eq("matches.status", "finished")
        .order("scheduled_at", { ascending: false, referencedTable: "matches" })

      const rows = (data ?? []) as unknown as HistoryRow[]
      setHistory((prev) => new Map(prev).set(userId, rows))
      setLoadingHistory(false)
    }
  }

  if (members.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
        <p className="text-gray-500 text-sm">Aún no hay miembros</p>
      </div>
    )
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
      <AnimatePresence initial={false}>
        {members.map((member, idx) => {
          const isMe = member.user_id === currentUserId
          const position = idx + 1
          const prevRank = previousRanks.get(member.user_id)
          const moved =
            prevRank !== undefined && prevRank !== null && member.rank !== null
              ? prevRank - member.rank
              : 0
          const isOpen = expanded === member.user_id
          const rows = history.get(member.user_id)

          return (
            <motion.div
              key={member.user_id}
              layout
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className={`border-b border-white/5 last:border-b-0 ${isMe ? "bg-green-500/5" : ""}`}
            >
              <button
                onClick={() => toggleExpand(member.user_id)}
                className="w-full flex items-center gap-4 px-4 py-3 hover:bg-white/[0.03] transition-colors text-left"
              >
                <div className="w-8 text-center flex-shrink-0">
                  {position === 1 ? (
                    <Crown size={18} className="text-yellow-400 mx-auto" />
                  ) : (
                    <span
                      className={`text-sm font-bold ${
                        position === 2 ? "text-gray-300" : position === 3 ? "text-orange-400" : "text-gray-600"
                      }`}
                    >
                      {position}
                    </span>
                  )}
                </div>
                <Avatar
                  config={member.profiles?.avatar_config}
                  username={member.profiles?.username}
                  size={36}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-semibold truncate text-sm">
                      {member.profiles?.display_name ?? "Usuario"}
                    </p>
                    {isMe && <span className="text-green-400 text-xs">(vos)</span>}
                    {moved > 0 && (
                      <span className="flex items-center gap-0.5 text-green-400 text-xs">
                        <TrendingUp size={10} />
                        {moved}
                      </span>
                    )}
                    {moved < 0 && (
                      <span className="flex items-center gap-0.5 text-red-400 text-xs">
                        <TrendingDown size={10} />
                        {Math.abs(moved)}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 text-xs">@{member.profiles?.username}</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-black">{member.points}</p>
                  <p className="text-gray-600 text-xs">puntos</p>
                </div>
                <ChevronDown
                  size={16}
                  className={`text-gray-600 flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>

              {/* Historial de puntos del jugador */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-3 pt-1 bg-black/20">
                      {loadingHistory && !rows ? (
                        <div className="flex items-center justify-center gap-2 py-4 text-gray-500 text-xs">
                          <Loader2 size={14} className="animate-spin" /> Cargando historial...
                        </div>
                      ) : !rows || rows.length === 0 ? (
                        <p className="text-gray-600 text-xs text-center py-4">
                          Todavía no tiene partidos puntuados en esta liga
                        </p>
                      ) : (
                        <PlayerHistory rows={rows} />
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

function PlayerHistory({ rows }: { rows: HistoryRow[] }) {
  const scored = rows.filter((r) => (r.points_earned ?? 0) > 0).length
  const exact = rows.filter(
    (r) =>
      r.matches &&
      r.home_score_pred === r.matches.home_score &&
      r.away_score_pred === r.matches.away_score
  ).length

  return (
    <div>
      <div className="flex items-center gap-3 text-[11px] text-gray-500 mb-2 px-1">
        <span>{rows.length} partidos</span>
        <span className="text-green-400">{scored} acertados</span>
        {exact > 0 && <span className="text-yellow-400">{exact} exactos</span>}
      </div>
      <div className="space-y-1">
        {rows.map((r, i) => {
          const m = r.matches
          if (!m) return null
          const pts = r.points_earned ?? 0
          const isExact =
            r.home_score_pred === m.home_score && r.away_score_pred === m.away_score
          return (
            <div
              key={i}
              className="flex items-center gap-2 text-xs bg-white/[0.03] rounded-lg px-2.5 py-1.5"
            >
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <TeamFlag code={m.home_team_code} size={16} />
                <span className="text-gray-400 tabular-nums font-medium">
                  {m.home_score}-{m.away_score}
                </span>
                <TeamFlag code={m.away_team_code} size={16} />
              </div>
              <span className="text-gray-600">
                predijo <span className="text-gray-400 tabular-nums">{r.home_score_pred}-{r.away_score_pred}</span>
              </span>
              <span
                className={`font-bold tabular-nums w-9 text-right ${
                  isExact ? "text-yellow-400" : pts > 0 ? "text-green-400" : "text-gray-600"
                }`}
              >
                {pts > 0 ? `+${pts}` : "0"}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

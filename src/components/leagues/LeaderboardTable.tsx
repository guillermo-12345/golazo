"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import Avatar from "@/components/Avatar"
import { Crown, TrendingUp, TrendingDown } from "lucide-react"
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
      // Guardar ranks anteriores para mostrar TrendingUp/Down
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

          return (
            <motion.div
              key={member.user_id}
              layout
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className={`flex items-center gap-4 px-4 py-3 border-b border-white/5 last:border-b-0 ${
                isMe ? "bg-green-500/5" : ""
              }`}
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
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

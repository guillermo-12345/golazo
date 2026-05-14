"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Match } from "@/types/database"
import TeamFlag from "@/components/TeamFlag"
import Link from "next/link"

type Props = {
  initialMatch: Match
}

/**
 * Score grande con flags, se actualiza realtime cuando el cron sincroniza.
 * Variante full para la pagina de detalle del partido.
 */
export default function LiveMatchScoreboard({ initialMatch }: Props) {
  const [match, setMatch] = useState<Match>(initialMatch)

  useEffect(() => {
    const supabase = createClient()
    let mounted = true
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let channel: any = null

    channel = supabase
      .channel(`scoreboard-${initialMatch.id}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "matches",
          filter: `id=eq.${initialMatch.id}`,
        },
        (payload) => {
          if (!mounted) return
          setMatch(payload.new as Match)
        }
      )
      .subscribe()

    return () => {
      mounted = false
      if (channel) supabase.removeChannel(channel)
    }
  }, [initialMatch.id])

  const showScore = match.status === "live" || match.status === "finished"

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
      <Link href={`/equipos/${match.home_team_code}`} className="text-center group">
        <div className="mb-2 flex justify-center">
          <TeamFlag
            code={match.home_team_code}
            size={64}
            className="group-hover:scale-105 transition-transform"
          />
        </div>
        <p className="text-white font-bold group-hover:text-green-400 transition-colors">
          {match.home_team}
        </p>
      </Link>

      <div className="text-center">
        {!showScore ? (
          <span className="text-2xl text-gray-500 font-light">vs</span>
        ) : (
          <div className="flex flex-col items-center">
            <span className="text-3xl text-white font-black tabular-nums">
              {match.home_score ?? 0} - {match.away_score ?? 0}
            </span>
            {match.status === "live" && match.minute !== null && (
              <span className="mt-1 text-red-400 text-xs font-bold font-mono">
                {match.minute}&apos;
              </span>
            )}
            {match.status === "finished" && (
              <span className="mt-1 text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                Final
              </span>
            )}
          </div>
        )}
      </div>

      <Link href={`/equipos/${match.away_team_code}`} className="text-center group">
        <div className="mb-2 flex justify-center">
          <TeamFlag
            code={match.away_team_code}
            size={64}
            className="group-hover:scale-105 transition-transform"
          />
        </div>
        <p className="text-white font-bold group-hover:text-green-400 transition-colors">
          {match.away_team}
        </p>
      </Link>
    </div>
  )
}

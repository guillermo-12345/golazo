"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Match } from "@/types/database"

type Props = {
  initialMatch: Match
  /** Si se setea, llama a este callback con la nueva info en cada update. */
  onUpdate?: (match: Match) => void
}

/**
 * Suscribe a cambios realtime de un partido específico (cuando lo actualiza
 * el cron de sync-live) y muestra el score y minuto en vivo.
 *
 * Si el partido NO está en vivo, no muestra nada (lo controla la página padre).
 */
export default function LiveScore({ initialMatch, onUpdate }: Props) {
  const [match, setMatch] = useState<Match>(initialMatch)

  useEffect(() => {
    if (initialMatch.status !== "live") return

    const supabase = createClient()
    let mounted = true
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let channel: any = null

    channel = supabase
      .channel(`match-${initialMatch.id}-${Date.now()}`)
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
          const updated = payload.new as Match
          setMatch(updated)
          onUpdate?.(updated)
        }
      )
      .subscribe()

    return () => {
      mounted = false
      if (channel) supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMatch.id, initialMatch.status])

  if (match.status !== "live") return null

  return (
    <div className="flex items-center justify-center gap-3 mb-4">
      <div className="flex items-center gap-2 bg-red-500/15 border border-red-500/40 rounded-full px-3 py-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
        </span>
        <span className="text-red-300 text-xs font-bold uppercase tracking-wider">En vivo</span>
        {match.minute !== null && (
          <span className="text-red-200 text-xs font-mono tabular-nums">{match.minute}'</span>
        )}
      </div>
    </div>
  )
}

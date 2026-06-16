"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import TeamFlag from "@/components/TeamFlag"
import LocalDateTime from "@/components/LocalDateTime"
import { ArrowRight } from "lucide-react"
import type { Match } from "@/types/database"

const LIVE_WINDOW_MS = 150 * 60 * 1000 // ~2.5h: ventana en la que un partido podría estar en juego

/**
 * Banner al tope del inicio: el partido EN VIVO (marcador en tiempo real) o,
 * si no hay, el ÚLTIMO partido jugado, siempre a mano. Se refresca solo cada
 * 60s y por realtime para captar el arranque y los goles.
 */
export default function LiveMatchBanner() {
  const [match, setMatch] = useState<Match | null>(null)
  const [isLive, setIsLive] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    let mounted = true

    async function load() {
      const nowMs = Date.now()
      // En juego: marcado live, o programado dentro de su ventana horaria
      const { data: liveData } = await supabase
        .from("matches")
        .select("*")
        .neq("home_team_code", "TBD")
        .in("status", ["live", "scheduled"])
        .lte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: false })
        .limit(5)

      const live = ((liveData ?? []) as Match[]).find((m) => {
        if (m.status === "live") return true
        const k = new Date(m.scheduled_at).getTime()
        return m.status === "scheduled" && nowMs <= k + LIVE_WINDOW_MS
      })

      if (live) {
        if (mounted) {
          setMatch(live)
          setIsLive(true)
        }
        return
      }

      // Si no hay en vivo: el último partido terminado
      const { data: lastData } = await supabase
        .from("matches")
        .select("*")
        .eq("status", "finished")
        .order("scheduled_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (mounted) {
        setMatch((lastData ?? null) as Match | null)
        setIsLive(false)
      }
    }

    load()
    const interval = setInterval(load, 60_000)
    const channel = supabase
      .channel(`live-banner-${Date.now()}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "matches" }, () => load())
      .subscribe()

    return () => {
      mounted = false
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [])

  if (!match) return null

  const finished = !isLive && match.status === "finished"

  return (
    <Link
      href={`/partidos/${match.id}`}
      className={`block rounded-2xl p-4 mb-6 border transition-colors group ${
        isLive
          ? "bg-gradient-to-r from-red-500/15 to-transparent border-red-500/40 hover:border-red-500/60"
          : "bg-gradient-to-r from-white/[0.07] to-transparent border-white/10 hover:border-white/20"
      }`}
    >
      {/* Etiqueta */}
      <div className="flex items-center justify-between mb-3">
        {isLive ? (
          <span className="flex items-center gap-1.5 text-red-400 text-xs font-black uppercase tracking-wider">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            En vivo
            {match.minute != null && <span className="text-red-300">· {match.minute}&apos;</span>}
          </span>
        ) : (
          <span className="text-gray-400 text-xs font-black uppercase tracking-wider">
            Último partido
          </span>
        )}
        <span className="text-gray-500 text-xs">
          <LocalDateTime date={match.scheduled_at} formatStr="d MMM · HH:mm" />
        </span>
      </div>

      {/* Equipos + marcador */}
      <div className="flex items-center justify-center gap-3">
        <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
          <span className="text-white font-bold text-sm truncate text-right">{match.home_team}</span>
          <TeamFlag code={match.home_team_code} size={28} />
        </div>

        <div className="shrink-0 min-w-[56px] text-center">
          {isLive || finished ? (
            <span className="text-2xl font-black text-white tabular-nums">
              {match.home_score ?? 0}-{match.away_score ?? 0}
            </span>
          ) : (
            <span className="text-gray-500 font-bold">vs</span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <TeamFlag code={match.away_team_code} size={28} />
          <span className="text-white font-bold text-sm truncate">{match.away_team}</span>
        </div>
      </div>

      {/* CTA */}
      <div className="flex items-center justify-center gap-1.5 mt-3 text-xs font-bold">
        <span className={isLive ? "text-red-400" : "text-gray-400 group-hover:text-white transition-colors"}>
          {isLive ? "Ver el partido" : "Ver resultado y tu predicción"}
        </span>
        <ArrowRight
          size={13}
          className={`${isLive ? "text-red-400" : "text-gray-400"} group-hover:translate-x-0.5 transition-transform`}
        />
      </div>
    </Link>
  )
}

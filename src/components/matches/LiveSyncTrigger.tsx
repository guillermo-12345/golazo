"use client"

import { useEffect } from "react"

/**
 * Mientras se ve un partido en juego, dispara /api/matches/live-refresh
 * cada 90s para traer el marcador casi en vivo. El endpoint tiene throttle,
 * así que aunque varios miren a la vez no satura ESPN. Los cambios llegan a
 * la pantalla por Realtime (LiveScore/LiveMatchScoreboard).
 *
 * No renderiza nada.
 */
export default function LiveSyncTrigger({ active }: { active: boolean }) {
  useEffect(() => {
    if (!active) return
    let cancelled = false

    const refresh = () => {
      // fire-and-forget; los errores no importan (reintenta al próximo tick)
      fetch("/api/matches/live-refresh", { method: "POST" }).catch(() => {})
    }

    refresh() // primer disparo al entrar
    const id = setInterval(() => {
      if (!cancelled && document.visibilityState === "visible") refresh()
    }, 90_000)

    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [active])

  return null
}

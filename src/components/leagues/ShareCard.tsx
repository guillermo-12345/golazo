"use client"

import { useState } from "react"
import { Share2, Loader2, Check } from "lucide-react"

/**
 * Botón "Compartir mi posición": genera la imagen de la tarjeta y la manda
 * al menú nativo de iOS (WhatsApp, etc.) con navigator.share. Si el navegador
 * no soporta compartir archivos, abre la imagen para guardarla a mano.
 */
export default function ShareCard({
  leagueId,
  userId,
}: {
  leagueId: string
  userId: string
}) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function share() {
    setLoading(true)
    try {
      const imgUrl = `/api/share/league-card?league=${leagueId}&user=${userId}`
      const text = `Mirá cómo voy en la quiniela del Mundial 2026 ⚽ Sumate: ${window.location.origin}`

      const res = await fetch(imgUrl)
      const blob = await res.blob()
      const file = new File([blob], "golazo.png", { type: "image/png" })

      // iOS/Android modernos: compartir la imagen directo
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text })
        setDone(true)
        setTimeout(() => setDone(false), 2500)
      } else {
        // Fallback: abrir la imagen en otra pestaña para guardarla/compartirla
        window.open(imgUrl, "_blank")
      }
    } catch {
      // El usuario canceló el share o falló: no hacemos nada
    }
    setLoading(false)
  }

  return (
    <button
      onClick={share}
      disabled={loading}
      className="flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-400 disabled:opacity-60 text-black font-bold py-3 rounded-xl text-sm transition-colors"
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : done ? (
        <Check size={16} />
      ) : (
        <Share2 size={16} />
      )}
      {loading ? "Generando..." : done ? "¡Listo!" : "Compartir mi posición"}
    </button>
  )
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { LogOut, Loader2, AlertTriangle } from "lucide-react"

type Props = {
  leagueId: string
  leagueName: string
}

export default function LeaveLeagueButton({ leagueId, leagueName }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLeave() {
    setError(null)
    setLeaving(true)
    const supabase = createClient()
    const { data } = await supabase.rpc("leave_league", { p_league_id: leagueId })
    const result = data as { ok: boolean; error?: string }
    if (!result?.ok) {
      const msgs: Record<string, string> = {
        creator_must_delete: "Sos el creador, no podés salir. Eliminá la liga si querés irte.",
        cannot_leave_global: "No podés salir de la Liga Global.",
        not_authenticated: "Tenés que iniciar sesión.",
      }
      setError(msgs[result?.error ?? ""] ?? "No se pudo salir de la liga")
      setLeaving(false)
      return
    }
    router.push("/ligas")
    router.refresh()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-gray-500 hover:text-red-400 text-xs transition-colors"
      >
        <LogOut size={12} />
        Salir de la liga
      </button>
    )
  }

  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mt-4">
      <div className="flex items-start gap-3 mb-3">
        <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-white text-sm font-bold">¿Salir de &quot;{leagueName}&quot;?</p>
          <p className="text-gray-400 text-xs mt-1">
            Vas a perder tus predicciones, puntos y posición en esta liga.
            Podés volver a unirte si tenés el código.
          </p>
        </div>
      </div>

      {error && (
        <p className="text-red-400 text-xs mb-2">{error}</p>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => {
            setOpen(false)
            setError(null)
          }}
          className="flex-1 bg-white/10 hover:bg-white/15 text-white text-sm font-medium py-2 rounded-lg transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleLeave}
          disabled={leaving}
          className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-400 disabled:opacity-40 text-white text-sm font-bold py-2 rounded-lg transition-colors"
        >
          {leaving && <Loader2 size={14} className="animate-spin" />}
          Salir
        </button>
      </div>
    </div>
  )
}

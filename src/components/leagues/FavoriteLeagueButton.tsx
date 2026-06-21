"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

export default function FavoriteLeagueButton({
  leagueId,
  initialFavorite,
}: {
  leagueId: string
  initialFavorite: boolean
}) {
  const router = useRouter()
  const [fav, setFav] = useState(initialFavorite)
  const [saving, setSaving] = useState(false)

  async function toggle() {
    const next = !fav
    setFav(next) // optimista
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.rpc("set_favorite_league", {
      p_league_id: leagueId,
      p_fav: next,
    })
    if (error) setFav(!next) // revertir si falla
    else router.refresh()
    setSaving(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={saving}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors disabled:opacity-60",
        fav
          ? "bg-yellow-500/15 border-yellow-500/40 text-yellow-300"
          : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"
      )}
      aria-label={fav ? "Quitar de favoritas" : "Marcar como favorita"}
    >
      <Star size={15} className={fav ? "fill-yellow-400 text-yellow-400" : ""} />
      {fav ? "Favorita" : "Favorita"}
    </button>
  )
}

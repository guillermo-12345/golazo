"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Hash, Loader2, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function UnirseLigaPage() {
  const router = useRouter()
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleJoin() {
    if (code.length < 4) {
      setError("Ingresá un código válido")
      return
    }
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push("/login")
      return
    }

    const { data: league } = await supabase
      .from("leagues")
      .select("id")
      .eq("invite_code", code.toUpperCase())
      .single()

    if (!league) {
      setError("Código inválido. Verificá con quien te invitó.")
      setLoading(false)
      return
    }

    const leagueData = league as { id: string }

    // Verificar si ya está en la liga
    const { data: existing } = await supabase
      .from("league_members")
      .select("user_id")
      .eq("league_id", leagueData.id)
      .eq("user_id", user.id)
      .single()

    if (existing) {
      router.push(`/ligas/${leagueData.id}`)
      return
    }

    const { error: joinError } = await supabase.from("league_members").insert({
      league_id: leagueData.id,
      user_id: user.id,
    })

    if (joinError) {
      setError("No se pudo unir. Intentá de nuevo.")
      setLoading(false)
      return
    }

    router.push(`/ligas/${leagueData.id}`)
  }

  return (
    <main className="max-w-md mx-auto px-4 md:px-8 py-8">
      <Link
        href="/ligas"
        className="inline-flex items-center gap-2 text-gray-500 hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Volver
      </Link>

      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Hash size={28} className="text-green-400" />
        </div>
        <h1 className="text-2xl font-black text-white">Unirse a una liga</h1>
        <p className="text-gray-500 mt-2 text-sm">Pedile el código a quien te invitó</p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Código de invitación</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            maxLength={8}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white text-2xl tracking-[0.3em] text-center font-mono placeholder-gray-700 focus:outline-none focus:border-green-500 transition-colors"
          />
          {error && <p className="text-red-400 text-xs mt-2 text-center">{error}</p>}
        </div>

        <button
          onClick={handleJoin}
          disabled={loading || code.length < 4}
          className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-black py-3.5 rounded-xl transition-colors"
        >
          {loading && <Loader2 size={18} className="animate-spin" />}
          {loading ? "Buscando..." : "Unirme"}
        </button>
      </div>
    </main>
  )
}

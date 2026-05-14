"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Hash, Loader2, ArrowLeft, KeyRound, Eye, EyeOff, Lock } from "lucide-react"
import Link from "next/link"

type LeagueCheck = {
  exists: boolean
  requires_password?: boolean
  league_name?: string
  banner_color?: string
}

export default function UnirseLigaPage() {
  const router = useRouter()
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [leagueCheck, setLeagueCheck] = useState<LeagueCheck | null>(null)

  // Cuando termina de escribir el código (4+ chars), pregunta si requiere password
  async function handleCodeChange(value: string) {
    const upper = value.toUpperCase()
    setCode(upper)
    setError(null)
    setLeagueCheck(null)

    if (upper.length < 4) return

    setChecking(true)
    const supabase = createClient()
    const { data, error: rpcError } = await supabase.rpc("league_requires_password", {
      p_invite_code: upper,
    })

    setChecking(false)
    if (rpcError) return
    setLeagueCheck(data as LeagueCheck)
  }

  async function handleJoin() {
    if (code.length < 4) {
      setError("Ingresá un código válido")
      return
    }
    if (leagueCheck?.requires_password && password.length < 4) {
      setError("Esta liga requiere una contraseña")
      return
    }

    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data, error: rpcError } = await supabase.rpc("join_league_by_code", {
      p_invite_code: code,
      p_password: password || null,
    })

    if (rpcError) {
      setError("No se pudo conectar. Intentá de nuevo.")
      setLoading(false)
      return
    }

    const result = data as { ok: boolean; league_id?: string; error?: string; league_name?: string }

    if (!result.ok) {
      const msgs: Record<string, string> = {
        not_authenticated: "Tenés que iniciar sesión",
        invalid_code: "Código inválido. Verificá con quien te invitó.",
        password_required: `La liga "${result.league_name}" requiere contraseña`,
        invalid_password: "Contraseña incorrecta",
      }
      setError(msgs[result.error ?? ""] ?? "Error al unirse")
      // Si necesita password, actualizamos el check para que aparezca el campo
      if (result.error === "password_required") {
        setLeagueCheck({
          exists: true,
          requires_password: true,
          league_name: result.league_name,
        })
      }
      setLoading(false)
      return
    }

    router.push(`/ligas/${result.league_id}`)
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
        {/* Código */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Código de invitación
          </label>
          <div className="relative">
            <input
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder="ABC123"
              maxLength={8}
              autoComplete="off"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white text-2xl tracking-[0.3em] text-center font-mono placeholder-gray-700 focus:outline-none focus:border-green-500 transition-colors"
            />
            {checking && (
              <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-500" />
            )}
          </div>

          {/* Liga encontrada */}
          {leagueCheck?.exists && (
            <div className="mt-3 flex items-center gap-2 bg-green-500/5 border border-green-500/20 rounded-xl px-3 py-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: leagueCheck.banner_color ?? "#16a34a" }}
              />
              <span className="text-sm text-white truncate">{leagueCheck.league_name}</span>
              {leagueCheck.requires_password && (
                <Lock size={12} className="text-yellow-400 ml-auto flex-shrink-0" />
              )}
            </div>
          )}
        </div>

        {/* Contraseña — solo si la liga la requiere */}
        {leagueCheck?.requires_password && (
          <div>
            <label className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-1.5">
              <KeyRound size={14} className="text-yellow-400" />
              Contraseña de la liga
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                autoComplete="off"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-10 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-green-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-xs text-center">
            {error}
          </div>
        )}

        <button
          onClick={handleJoin}
          disabled={loading || code.length < 4 || (leagueCheck?.requires_password === true && password.length < 4)}
          className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-black py-3.5 rounded-xl transition-colors"
        >
          {loading && <Loader2 size={18} className="animate-spin" />}
          {loading ? "Uniéndome..." : "Unirme"}
        </button>
      </div>
    </main>
  )
}

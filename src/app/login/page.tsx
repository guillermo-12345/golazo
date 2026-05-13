"use client"

export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/client"
import { useState } from "react"
import { LogIn, Loader2 } from "lucide-react"

export default function LoginPage() {
  const [loading, setLoading] = useState(false)

  async function handleGoogleLogin() {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-green-950/20 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-green-500/8 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <span className="text-4xl font-black text-white tracking-tight">
            GOL<span className="text-green-500">AZO</span>
          </span>
          <p className="text-gray-500 mt-2 text-sm">Quiniela del Mundial 2026</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <h1 className="text-xl font-bold text-white text-center mb-2">Entrá a jugar</h1>
          <p className="text-gray-500 text-sm text-center mb-8">
            Gratis, sin tarjeta, sin complicaciones.
          </p>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 disabled:opacity-60 text-black font-bold py-3.5 px-6 rounded-xl transition-colors"
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <LogIn size={20} />
            )}
            {loading ? "Conectando..." : "Continuar con Google"}
          </button>

          <p className="text-gray-600 text-xs text-center mt-6 leading-relaxed">
            Al entrar aceptás que esto es solo por diversión.<br />
            Sin apuestas reales de dinero.
          </p>
        </div>

        <p className="text-center mt-6">
          <a href="/" className="text-gray-600 hover:text-gray-400 text-sm transition-colors">
            ← Volver al inicio
          </a>
        </p>
      </div>
    </main>
  )
}

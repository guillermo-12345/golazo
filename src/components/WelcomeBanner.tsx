"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { X, BookOpen, Trophy, Sparkles } from "lucide-react"

const STORAGE_KEY = "golazo_welcome_seen_v1"

export default function WelcomeBanner({ displayName }: { displayName: string }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY)
      if (!seen) setShow(true)
    } catch {
      // localStorage no disponible — no mostramos
    }
  }, [])

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "1")
    } catch {}
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="relative bg-gradient-to-br from-green-500/15 to-green-600/5 border border-green-500/30 rounded-2xl p-5 mb-6 overflow-hidden">
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-green-500/10 rounded-full blur-3xl pointer-events-none" />

      <button
        onClick={dismiss}
        className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-10"
        aria-label="Cerrar"
      >
        <X size={14} className="text-white" />
      </button>

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={18} className="text-green-400" />
          <h2 className="text-white font-black text-lg">¡Bienvenido, {displayName}! 🎉</h2>
        </div>
        <p className="text-gray-300 text-sm mb-4 max-w-lg">
          Golazo es mucho más que predecir partidos: armá tu propia liga privada,
          invitá a tus amigos y competí en tu tabla. Por acá empezás:
        </p>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <Link
            href="/ligas/crear"
            onClick={dismiss}
            className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 text-black font-bold px-5 py-3 rounded-xl text-sm transition-colors flex-1"
          >
            <Trophy size={16} />
            Crear mi liga
          </Link>
          <Link
            href="/como-jugar"
            onClick={dismiss}
            className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white font-bold px-5 py-3 rounded-xl text-sm transition-colors flex-1"
          >
            <BookOpen size={16} />
            Aprender a jugar
          </Link>
        </div>
      </div>
    </div>
  )
}

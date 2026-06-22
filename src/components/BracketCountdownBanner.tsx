"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { GitBranch, Clock, ArrowRight } from "lucide-react"

// Mismo cierre que en src/app/(app)/bracket/page.tsx
const DEADLINE = new Date("2026-06-25T02:59:59Z")
// Mostrar el aviso desde estos días antes del cierre
const SHOW_WITHIN_DAYS = 8

function parts(ms: number) {
  const d = Math.floor(ms / 86400000)
  const h = Math.floor((ms % 86400000) / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return { d, h, m, s }
}

/**
 * Aviso en el inicio de que el Bracket Challenge está por cerrar, con cuenta
 * regresiva en vivo y link directo. Aparece solo en los días previos al cierre
 * y desaparece solo cuando vence.
 */
export default function BracketCountdownBanner() {
  const [left, setLeft] = useState<number | null>(null)

  useEffect(() => {
    const tick = () => setLeft(DEADLINE.getTime() - Date.now())
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  if (left === null) return null
  if (left <= 0) return null // ya cerró
  if (left > SHOW_WITHIN_DAYS * 86400000) return null // todavía falta mucho

  const { d, h, m, s } = parts(left)
  const urgent = left < 24 * 3600000 // menos de un día

  return (
    <Link
      href="/bracket"
      className={`block rounded-2xl p-4 mb-6 border transition-colors group ${
        urgent
          ? "bg-gradient-to-r from-red-500/15 to-transparent border-red-500/40 hover:border-red-500/60"
          : "bg-gradient-to-r from-yellow-500/12 to-transparent border-yellow-500/30 hover:border-yellow-500/50"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
            urgent ? "bg-red-500/20 border-red-500/40" : "bg-yellow-500/20 border-yellow-500/40"
          }`}
        >
          <GitBranch size={20} className={urgent ? "text-red-400" : "text-yellow-400"} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm">
            El Bracket Challenge {urgent ? "cierra hoy" : "está por cerrar"}
          </p>
          <p
            className={`text-xs mt-0.5 flex items-center gap-1.5 font-mono tabular-nums ${
              urgent ? "text-red-300" : "text-yellow-300"
            }`}
          >
            <Clock size={11} className="shrink-0" />
            {d > 0 && <span>{d}d</span>}
            <span>{String(h).padStart(2, "0")}h</span>
            <span>{String(m).padStart(2, "0")}m</span>
            {d === 0 && <span>{String(s).padStart(2, "0")}s</span>}
            <span className="text-gray-500">restantes</span>
          </p>
        </div>

        <ArrowRight
          size={18}
          className={`shrink-0 ${urgent ? "text-red-400" : "text-yellow-400"} group-hover:translate-x-0.5 transition-transform`}
        />
      </div>
    </Link>
  )
}

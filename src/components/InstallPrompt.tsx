"use client"

import { useEffect, useState } from "react"
import { Share, X, Plus } from "lucide-react"

const STORAGE_KEY = "golazo_ios_install_dismissed_v1"

/**
 * Guía para "instalar" Golazo en iPhone. iOS Safari no tiene prompt
 * automático: hay que hacer Compartir → "Agregar a pantalla de inicio".
 * Se muestra solo en iOS, fuera de la app ya instalada (standalone), y se
 * puede descartar (queda guardado).
 */
export default function InstallPrompt() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY)) return
    } catch {
      return
    }

    const ua = window.navigator.userAgent
    const isIOS =
      /iphone|ipad|ipod/i.test(ua) ||
      // iPad moderno se reporta como Mac: detectarlo por touch
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)

    // ¿Ya está instalada (abierta como app)?
    const standalone =
      ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone) ||
      window.matchMedia("(display-mode: standalone)").matches

    if (isIOS && !standalone) {
      // Pequeño delay para no aparecer encima de la carga inicial
      const t = setTimeout(() => setShow(true), 1500)
      return () => clearTimeout(t)
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
    <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 px-4 md:hidden">
      <div className="relative mx-auto max-w-md bg-[#111] border border-green-500/30 rounded-2xl p-4 shadow-2xl shadow-black/60">
        <button
          onClick={dismiss}
          className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
          aria-label="Cerrar"
        >
          <X size={14} className="text-white" />
        </button>

        <div className="flex items-start gap-3 pr-6">
          <div className="w-10 h-10 rounded-xl bg-green-500/20 border border-green-500/40 flex items-center justify-center shrink-0">
            <span className="text-lg font-black text-green-400">G</span>
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-sm">Instalá Golazo en tu iPhone</p>
            <p className="text-gray-400 text-xs mt-1 leading-relaxed">
              Tocá{" "}
              <Share size={13} className="inline -mt-0.5 text-blue-400" /> abajo y luego{" "}
              <span className="text-white font-medium">
                “Agregar a inicio” <Plus size={12} className="inline -mt-0.5" />
              </span>
              . Queda como una app, sin barra del navegador.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

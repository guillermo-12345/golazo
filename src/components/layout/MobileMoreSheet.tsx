"use client"

import { useEffect } from "react"
import Link from "next/link"
import {
  X,
  Globe,
  Grid3X3,
  GitBranch,
  BarChart3,
  TrendingUp,
  History,
  Search,
  BookOpen,
  Settings,
  LogOut,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

type Props = {
  open: boolean
  onClose: () => void
}

const ITEMS = [
  { href: "/grupos", icon: Grid3X3, label: "Grupos", color: "text-green-400" },
  { href: "/paises", icon: Globe, label: "Países", color: "text-green-400" },
  { href: "/bracket", icon: GitBranch, label: "Bracket Challenge", color: "text-yellow-400" },
  { href: "/ranking", icon: BarChart3, label: "Ranking global", color: "text-yellow-400" },
  { href: "/estadisticas", icon: TrendingUp, label: "Estadísticas", color: "text-blue-400" },
  { href: "/historia", icon: History, label: "Mi historia", color: "text-purple-400" },
  { href: "/buscar", icon: Search, label: "Buscar", color: "text-green-400" },
  { href: "/como-jugar", icon: BookOpen, label: "Cómo jugar", color: "text-green-400" },
  { href: "/configuracion", icon: Settings, label: "Configuración", color: "text-gray-400" },
]

export default function MobileMoreSheet({ open, onClose }: Props) {
  const router = useRouter()

  // Bloquear scroll del body cuando está abierto
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    onClose()
    router.push("/")
  }

  if (!open) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in"
        onClick={onClose}
      />

      {/* Sheet desde abajo */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-50 bg-black/95 backdrop-blur-xl border-t border-white/10 rounded-t-3xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 border-b border-white/10">
          <h2 className="text-white font-bold text-lg">Más</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center"
          >
            <X size={16} className="text-white" />
          </button>
        </div>

        {/* Items */}
        <nav className="py-2">
          {ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/5 transition-colors active:bg-white/10"
            >
              <item.icon size={20} className={item.color} />
              <span className="text-white text-base font-medium flex-1">{item.label}</span>
              <span className="text-gray-600">›</span>
            </Link>
          ))}

          <div className="border-t border-white/10 my-2" />

          <button
            onClick={handleLogout}
            className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/5 transition-colors active:bg-white/10 w-full text-left"
          >
            <LogOut size={20} className="text-red-400" />
            <span className="text-red-300 text-base font-medium flex-1">Cerrar sesión</span>
          </button>
        </nav>

        {/* Safe area para iPhones con notch inferior */}
        <div className="pb-8" />
      </div>
    </>
  )
}

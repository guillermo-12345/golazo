"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Trophy, GitBranch, User, LogOut, Grid3X3, CalendarDays, BarChart3, Settings, Search, BookOpen, TrendingUp, History, Globe, Shield } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { Profile } from "@/types/database"
import { cn } from "@/lib/utils"
import Avatar from "@/components/Avatar"
import NotificationBell from "@/components/notifications/NotificationBell"
import MobileMoreSheet from "@/components/layout/MobileMoreSheet"
import { useState } from "react"
import { MoreHorizontal } from "lucide-react"

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Inicio" },
  { href: "/calendario", icon: CalendarDays, label: "Calendario" },
  { href: "/grupos", icon: Grid3X3, label: "Grupos" },
  { href: "/paises", icon: Globe, label: "Países" },
  { href: "/ligas", icon: Trophy, label: "Ligas" },
  { href: "/bracket", icon: GitBranch, label: "Bracket" },
  { href: "/ranking", icon: BarChart3, label: "Ranking" },
  { href: "/estadisticas", icon: TrendingUp, label: "Estadísticas" },
  { href: "/historia", icon: History, label: "Mi historia" },
  { href: "/buscar", icon: Search, label: "Buscar" },
  { href: "/como-jugar", icon: BookOpen, label: "Cómo jugar" },
  { href: "/perfil", icon: User, label: "Perfil" },
]

// Mobile bottom nav: solo los 4 mas importantes + "Mas" sheet
const MOBILE_NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Inicio" },
  { href: "/calendario", icon: CalendarDays, label: "Calendario" },
  { href: "/grupos", icon: Grid3X3, label: "Grupos" },
  { href: "/ligas", icon: Trophy, label: "Ligas" },
  { href: "/perfil", icon: User, label: "Perfil" },
]

export default function DashboardNav({
  profile,
  isAdmin = false,
}: {
  profile: Profile
  isAdmin?: boolean
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [moreOpen, setMoreOpen] = useState(false)
  const navItems = isAdmin
    ? [...NAV_ITEMS, { href: "/admin", icon: Shield, label: "Admin" }]
    : NAV_ITEMS

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  return (
    <>
      {/* Top bar — mobile */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-4 py-3">
        <Link href="/dashboard">
          <span className="text-xl font-black text-white tracking-tight">
            GOL<span className="text-green-500">AZO</span>
          </span>
        </Link>
        <NotificationBell />
      </header>

      {/* Sidebar — desktop */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 flex-col border-r border-white/10 bg-black/60 backdrop-blur-xl px-4 py-6 z-40">
        <div className="flex items-center justify-between mb-8 px-2">
          <Link href="/dashboard">
            <span className="text-2xl font-black text-white tracking-tight">
              GOL<span className="text-green-500">AZO</span>
            </span>
          </Link>
          <NotificationBell />
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  active
                    ? "bg-green-500/15 text-green-400 border border-green-500/20"
                    : "text-gray-500 hover:text-white hover:bg-white/5"
                )}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Perfil en sidebar */}
        <div className="border-t border-white/10 pt-4 mt-4">
          <Link
            href={`/u/${profile.username}`}
            className="flex items-center gap-3 px-2 mb-3 hover:bg-white/5 -mx-1 py-2 rounded-xl transition-colors"
          >
            <Avatar config={profile.avatar_config} username={profile.username} size={36} />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{profile.display_name}</p>
              <p className="text-gray-600 text-xs">@{profile.username}</p>
            </div>
          </Link>
          <Link
            href="/configuracion"
            className="flex items-center gap-2 px-3 py-2 w-full text-gray-500 hover:text-white text-sm rounded-xl hover:bg-white/5 transition-colors"
          >
            <Settings size={16} />
            Configuración
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 w-full text-gray-600 hover:text-red-400 text-sm rounded-xl hover:bg-white/5 transition-colors"
          >
            <LogOut size={16} />
            Salir
          </button>
        </div>
      </aside>

      {/* Bottom nav — mobile */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0a0a0a] border-t-2 border-green-500/20 flex items-stretch justify-around px-1 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.6)]"
      >
        {MOBILE_NAV_ITEMS.slice(0, 4).map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-1 py-1.5 rounded-xl transition-all flex-1 relative",
                active ? "text-green-400" : "text-gray-400"
              )}
            >
              {active && (
                <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-green-500 rounded-full" />
              )}
              <item.icon size={22} strokeWidth={active ? 2.5 : 2} />
              <span className={cn("text-[10px]", active ? "font-bold" : "font-medium")}>
                {item.label}
              </span>
            </Link>
          )
        })}

        {/* Boton "Mas" - abre el sheet con todas las paginas secundarias */}
        <button
          onClick={() => setMoreOpen(true)}
          className={cn(
            "flex flex-col items-center gap-1 px-1 py-1.5 rounded-xl transition-all flex-1 relative",
            moreOpen ? "text-green-400" : "text-gray-400"
          )}
        >
          {moreOpen && (
            <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-green-500 rounded-full" />
          )}
          <MoreHorizontal size={22} strokeWidth={moreOpen ? 2.5 : 2} />
          <span className={cn("text-[10px]", moreOpen ? "font-bold" : "font-medium")}>Más</span>
        </button>
      </nav>

      {/* Sheet de "Más" en mobile */}
      <MobileMoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  )
}

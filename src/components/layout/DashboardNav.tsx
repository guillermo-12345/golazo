"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Calendar, Trophy, GitBranch, User, LogOut, Grid3X3 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { Profile } from "@/types/database"
import { cn } from "@/lib/utils"
import Avatar from "@/components/Avatar"
import NotificationBell from "@/components/notifications/NotificationBell"

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Inicio" },
  { href: "/grupos", icon: Grid3X3, label: "Grupos" },
  { href: "/partidos", icon: Calendar, label: "Partidos" },
  { href: "/ligas", icon: Trophy, label: "Ligas" },
  { href: "/bracket", icon: GitBranch, label: "Bracket" },
  { href: "/perfil", icon: User, label: "Perfil" },
]

export default function DashboardNav({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const router = useRouter()

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
          {NAV_ITEMS.map((item) => {
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
          <div className="flex items-center gap-3 px-2 mb-3">
            <Avatar config={profile.avatar_config} username={profile.username} size={36} />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{profile.display_name}</p>
              <p className="text-gray-600 text-xs">@{profile.username}</p>
            </div>
          </div>
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-xl border-t border-white/10 flex items-center justify-around px-2 py-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors",
                active ? "text-green-400" : "text-gray-600"
              )}
            >
              <item.icon size={20} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}

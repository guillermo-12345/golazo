"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Bell, Award, UserPlus, Trophy, Sparkles, Check, CheckCheck, Loader2 } from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"
import { es } from "date-fns/locale"
import Link from "next/link"
import { cn } from "@/lib/utils"

type Notification = {
  id: string
  type: string
  title: string
  message: string | null
  link: string | null
  read: boolean
  created_at: string
}

type Filter = "all" | "unread" | "badges" | "points" | "leagues"

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "unread", label: "No leídas" },
  { value: "badges", label: "Logros" },
  { value: "points", label: "Puntos" },
  { value: "leagues", label: "Ligas" },
]

const TYPE_ICON: Record<string, { icon: typeof Bell; color: string }> = {
  badge_earned: { icon: Award, color: "text-yellow-400" },
  league_joined: { icon: UserPlus, color: "text-green-400" },
  points_earned: { icon: Trophy, color: "text-orange-400" },
  default: { icon: Sparkles, color: "text-blue-400" },
}

const TYPE_TO_FILTER: Record<string, Filter> = {
  badge_earned: "badges",
  league_joined: "leagues",
  points_earned: "points",
}

export default function NotificacionesPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>("all")
  const [marking, setMarking] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100)

      setNotifications((data ?? []) as Notification[])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = notifications.filter((n) => {
    if (filter === "all") return true
    if (filter === "unread") return !n.read
    return TYPE_TO_FILTER[n.type] === filter
  })

  const unreadCount = notifications.filter((n) => !n.read).length

  async function markAllRead() {
    setMarking(true)
    const supabase = createClient()
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id)
    if (unreadIds.length === 0) {
      setMarking(false)
      return
    }
    await supabase.from("notifications").update({ read: true }).in("id", unreadIds)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setMarking(false)
  }

  async function markOneRead(id: string) {
    const supabase = createClient()
    await supabase.from("notifications").update({ read: true }).eq("id", id)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  // Agrupar por día
  const grouped = filtered.reduce<Record<string, Notification[]>>((acc, n) => {
    const day = format(new Date(n.created_at), "yyyy-MM-dd")
    if (!acc[day]) acc[day] = []
    acc[day].push(n)
    return acc
  }, {})

  return (
    <main className="max-w-3xl mx-auto px-4 md:px-8 py-8">
      <header className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white">Notificaciones</h1>
            <p className="text-gray-500 mt-1 text-sm">
              {unreadCount > 0 ? `${unreadCount} sin leer` : "Estás al día"}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              disabled={marking}
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
            >
              {marking ? <Loader2 size={14} className="animate-spin" /> : <CheckCheck size={14} />}
              Marcar todas
            </button>
          )}
        </div>

        {/* Filtros */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border",
                filter === f.value
                  ? "bg-green-500/20 border-green-500/50 text-white"
                  : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="text-green-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
          <Bell size={32} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No tenés notificaciones</p>
          <p className="text-gray-600 text-sm mt-1">
            {filter !== "all"
              ? "Probá con otro filtro"
              : "Aparecerán cuando ganes puntos, logros, o pase algo en tus ligas"}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([day, notifs]) => {
            const date = new Date(day)
            const isToday = format(new Date(), "yyyy-MM-dd") === day
            return (
              <section key={day}>
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">
                  {isToday ? "Hoy" : format(date, "EEEE d 'de' MMMM", { locale: es })}
                </h2>
                <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                  {notifs.map((n, idx) => {
                    const meta = TYPE_ICON[n.type] ?? TYPE_ICON.default
                    const Icon = meta.icon
                    const inner = (
                      <div
                        className={cn(
                          "flex items-start gap-3 px-4 py-3 transition-colors",
                          idx < notifs.length - 1 && "border-b border-white/5",
                          !n.read && "bg-green-500/5",
                          "hover:bg-white/5"
                        )}
                        onClick={() => !n.read && markOneRead(n.id)}
                      >
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                          <Icon size={16} className={meta.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-white text-sm font-semibold">{n.title}</p>
                            {!n.read && <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />}
                          </div>
                          {n.message && <p className="text-gray-400 text-sm mt-0.5">{n.message}</p>}
                          <p className="text-gray-600 text-xs mt-1">
                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: es })}
                          </p>
                        </div>
                        {n.read && (
                          <Check size={12} className="text-gray-600 flex-shrink-0 mt-2" />
                        )}
                      </div>
                    )
                    return n.link ? (
                      <Link key={n.id} href={n.link} className="block">
                        {inner}
                      </Link>
                    ) : (
                      <div key={n.id} className="cursor-pointer">
                        {inner}
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </main>
  )
}

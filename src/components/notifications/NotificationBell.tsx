"use client"

import { useEffect, useRef, useState } from "react"
import { Bell, Award, UserPlus, Trophy, Sparkles, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { formatDistanceToNow } from "date-fns"
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

const TYPE_ICON: Record<string, { icon: typeof Bell; color: string }> = {
  badge_earned: { icon: Award, color: "text-yellow-400" },
  league_joined: { icon: UserPlus, color: "text-green-400" },
  points_earned: { icon: Trophy, color: "text-orange-400" },
  default: { icon: Sparkles, color: "text-blue-400" },
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Cargar notificaciones + suscripción realtime
  useEffect(() => {
    const supabase = createClient()
    let mounted = true
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let channel: any = null

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !mounted) return

      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20)

      if (!mounted) return
      const notifs = (data ?? []) as Notification[]
      setNotifications(notifs)
      setUnreadCount(notifs.filter((n) => !n.read).length)

      // Canal único por user + timestamp para evitar colisiones en Strict Mode
      channel = supabase
        .channel(`notifications-${user.id}-${Date.now()}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload: { new: Notification }) => {
            if (!mounted) return
            const newNotif = payload.new
            setNotifications((prev) => [newNotif, ...prev].slice(0, 20))
            setUnreadCount((c) => c + 1)
          }
        )
        .subscribe()
    }

    init()

    return () => {
      mounted = false
      if (channel) supabase.removeChannel(channel)
    }
  }, [])

  // Cerrar dropdown al clickear afuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  async function markAllRead() {
    const supabase = createClient()
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id)
    if (unreadIds.length === 0) return

    await supabase.from("notifications").update({ read: true }).in("id", unreadIds)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  async function markOneRead(id: string) {
    const supabase = createClient()
    await supabase.from("notifications").update({ read: true }).eq("id", id)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    setUnreadCount((c) => Math.max(0, c - 1))
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors"
        aria-label="Notificaciones"
      >
        <Bell size={16} className="text-gray-300" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 max-h-[480px] bg-black/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <h3 className="text-white font-bold text-sm">Notificaciones</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-green-400 hover:text-green-300 transition-colors"
                >
                  Marcar todas
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto flex-1 max-h-96">
            {notifications.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Bell size={28} className="text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No tenés notificaciones</p>
                <p className="text-gray-600 text-xs mt-1">
                  Aparecerán cuando ganes puntos, logros o alguien se una a tu liga
                </p>
              </div>
            ) : (
              notifications.map((n) => {
                const meta = TYPE_ICON[n.type] ?? TYPE_ICON.default
                const Icon = meta.icon
                const inner = (
                  <div
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 border-b border-white/5 last:border-b-0 hover:bg-white/5 transition-colors cursor-pointer",
                      !n.read && "bg-green-500/5"
                    )}
                    onClick={() => !n.read && markOneRead(n.id)}
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon size={14} className={meta.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold">{n.title}</p>
                      {n.message && <p className="text-gray-400 text-xs mt-0.5">{n.message}</p>}
                      <p className="text-gray-600 text-[10px] mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: es })}
                      </p>
                    </div>
                    {!n.read && (
                      <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0 mt-2" />
                    )}
                  </div>
                )
                return n.link ? (
                  <Link key={n.id} href={n.link} onClick={() => setOpen(false)}>
                    {inner}
                  </Link>
                ) : (
                  <div key={n.id}>{inner}</div>
                )
              })
            )}
          </div>

          {notifications.length > 0 && (
            <Link
              href="/notificaciones"
              onClick={() => setOpen(false)}
              className="block text-center py-3 text-sm text-green-400 hover:text-green-300 border-t border-white/10 transition-colors"
            >
              Ver todas →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

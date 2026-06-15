"use client"

import { useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import Avatar from "@/components/Avatar"
import { Send, Loader2, MessageCircle, Trash2 } from "lucide-react"
import { format, isToday, isYesterday } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"

type Message = {
  id: string
  user_id: string
  message: string
  created_at: string
  profiles: {
    username: string
    display_name: string
    avatar_config: unknown
  } | null
}

type Props = {
  leagueId: string
  currentUserId: string
}

export default function LeagueChat({ leagueId, currentUserId }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Scrollea SOLO el contenedor del chat, no la página entera. (scrollIntoView
  // movía toda la vista al fondo al abrir la liga.)
  function scrollToBottom() {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }

  useEffect(() => {
    const supabase = createClient()
    let mounted = true
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let channel: any = null

    async function init() {
      const { data } = await supabase
        .from("league_messages")
        .select("id, user_id, message, created_at, profiles(username, display_name, avatar_config)")
        .eq("league_id", leagueId)
        .order("created_at", { ascending: false })
        .limit(50)

      if (!mounted) return
      const msgs = ((data ?? []) as unknown as Message[]).reverse()
      setMessages(msgs)
      setLoading(false)
      setTimeout(() => scrollToBottom(), 100)

      channel = supabase
        .channel(`chat-${leagueId}-${Date.now()}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "league_messages",
            filter: `league_id=eq.${leagueId}`,
          },
          async (payload) => {
            if (!mounted) return
            const raw = payload.new as { id: string; user_id: string; message: string; created_at: string }
            // Traer el perfil del autor
            const { data: prof } = await supabase
              .from("profiles")
              .select("username, display_name, avatar_config")
              .eq("id", raw.user_id)
              .single()
            const newMsg: Message = {
              id: raw.id,
              user_id: raw.user_id,
              message: raw.message,
              created_at: raw.created_at,
              profiles: (prof ?? null) as Message["profiles"],
            }
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev
              return [...prev, newMsg]
            })
            setTimeout(() => scrollToBottom(), 50)
          }
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "league_messages",
          },
          (payload) => {
            if (!mounted) return
            const removed = payload.old as { id: string }
            setMessages((prev) => prev.filter((m) => m.id !== removed.id))
          }
        )
        .subscribe()
    }

    init()
    return () => {
      mounted = false
      if (channel) supabase.removeChannel(channel)
    }
  }, [leagueId])

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || sending) return

    setSending(true)
    setError(null)
    const supabase = createClient()
    const { data: inserted, error: insErr } = await supabase
      .from("league_messages")
      .insert({
        league_id: leagueId,
        user_id: currentUserId,
        message: trimmed,
      })
      .select("id, user_id, message, created_at, profiles(username, display_name, avatar_config)")
      .single()

    if (insErr) {
      let msg = "No se pudo enviar el mensaje"
      if (insErr.message.includes("Rate limit")) {
        msg = "Esperá un momento antes de mandar más mensajes"
      } else if (
        insErr.message.includes("league_messages") ||
        insErr.code === "PGRST205" ||
        insErr.code === "42P01"
      ) {
        msg = "El chat todavía no está activado en esta liga. El administrador debe completar la configuración."
      } else if (insErr.code === "42501" || insErr.message.includes("policy")) {
        msg = "No tenés permiso para escribir en este chat"
      }
      setError(msg)
      setSending(false)
      return
    }

    // Agregar el mensaje al instante (no dependemos de Realtime para verlo).
    // Si Realtime también lo entrega, el dedup por id evita duplicarlo.
    if (inserted) {
      const newMsg = inserted as unknown as Message
      setMessages((prev) => (prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]))
      setTimeout(() => scrollToBottom(), 50)
    }
    setInput("")
    setSending(false)
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from("league_messages").delete().eq("id", id)
    setMessages((prev) => prev.filter((m) => m.id !== id))
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl flex flex-col h-[320px] md:h-[440px] w-full max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
        <MessageCircle size={18} className="text-green-400" />
        <h3 className="text-white font-bold text-sm">Chat de la liga</h3>
        <span className="text-gray-600 text-xs ml-auto">{messages.length} mensajes</span>
      </div>

      {/* Mensajes */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 size={20} className="text-gray-500 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageCircle size={32} className="text-gray-600 mb-3" />
            <p className="text-gray-400 text-sm font-medium">Todavía no hay mensajes</p>
            <p className="text-gray-600 text-xs mt-1">¡Sé el primero en escribir!</p>
          </div>
        ) : (
          messages.map((m, idx) => {
            const isMe = m.user_id === currentUserId
            const prev = messages[idx - 1]
            const sameAuthorAsPrev = prev && prev.user_id === m.user_id
            const showHeader = !sameAuthorAsPrev
            return (
              <div
                key={m.id}
                className={cn("flex gap-2.5 group", isMe && "flex-row-reverse")}
              >
                <div className="w-8 shrink-0">
                  {showHeader && (
                    <Avatar
                      config={m.profiles?.avatar_config}
                      username={m.profiles?.username}
                      size={32}
                    />
                  )}
                </div>
                <div className={cn("flex-1 min-w-0 max-w-[75%]", isMe && "flex flex-col items-end")}>
                  {showHeader && (
                    <div className={cn("flex items-center gap-2 mb-1", isMe && "flex-row-reverse")}>
                      <span className="text-white text-xs font-bold">
                        {isMe ? "Vos" : m.profiles?.display_name ?? "Usuario"}
                      </span>
                      <span className="text-gray-600 text-[10px]">{formatTime(m.created_at)}</span>
                    </div>
                  )}
                  <div
                    className={cn(
                      "inline-block px-3 py-2 rounded-2xl text-sm break-words",
                      isMe
                        ? "bg-green-500/20 border border-green-500/30 text-white rounded-tr-sm"
                        : "bg-white/10 border border-white/10 text-gray-200 rounded-tl-sm"
                    )}
                  >
                    {m.message}
                  </div>
                  {isMe && (
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-600 hover:text-red-400 mt-0.5"
                      aria-label="Borrar mensaje"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="border-t border-white/10 p-3">
        {error && <p className="text-red-400 text-xs mb-2 px-1">{error}</p>}
        <div className="flex gap-2 min-w-0">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribí un mensaje..."
            maxLength={500}
            className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500/50 transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="w-11 h-11 rounded-xl bg-green-500 hover:bg-green-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
          >
            {sending ? (
              <Loader2 size={16} className="text-black animate-spin" />
            ) : (
              <Send size={16} className="text-black" />
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  if (isToday(d)) return format(d, "HH:mm")
  if (isYesterday(d)) return "ayer " + format(d, "HH:mm")
  return format(d, "d MMM HH:mm", { locale: es })
}

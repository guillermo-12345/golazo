"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Search, Users, Trophy, Loader2 } from "lucide-react"
import Link from "next/link"
import Avatar from "@/components/Avatar"
import LeagueIcon from "@/components/LeagueIcon"
import { cn } from "@/lib/utils"

type ProfileResult = {
  id: string
  username: string
  display_name: string
  avatar_config: unknown
}

type LeagueResult = {
  id: string
  name: string
  description: string | null
  type: "global" | "public" | "private"
  banner_color: string
  is_verified: boolean
  config: { icon?: { style: string; seed: string } } | null
}

export default function BuscarPage() {
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [tab, setTab] = useState<"usuarios" | "ligas">("usuarios")
  const [users, setUsers] = useState<ProfileResult[]>([])
  const [leagues, setLeagues] = useState<LeagueResult[]>([])
  const [loading, setLoading] = useState(false)

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setUsers([])
      setLeagues([])
      return
    }

    async function search() {
      setLoading(true)
      const supabase = createClient()

      const [usersRes, leaguesRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, username, display_name, avatar_config")
          .or(`username.ilike.%${debouncedQuery}%,display_name.ilike.%${debouncedQuery}%`)
          .limit(20),
        supabase
          .from("leagues")
          .select("id, name, description, type, banner_color, is_verified, config")
          .ilike("name", `%${debouncedQuery}%`)
          .in("type", ["public", "global"])
          .limit(20),
      ])

      setUsers((usersRes.data ?? []) as ProfileResult[])
      setLeagues((leaguesRes.data ?? []) as LeagueResult[])
      setLoading(false)
    }
    search()
  }, [debouncedQuery])

  return (
    <main className="max-w-3xl mx-auto px-4 md:px-8 py-8">
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Search size={28} className="text-green-400" />
          <h1 className="text-2xl md:text-3xl font-black text-white">Buscar</h1>
        </div>
        <p className="text-gray-500 text-sm">Encontrá usuarios y ligas públicas</p>
      </header>

      {/* Input de búsqueda */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nombre, usuario o liga..."
          autoFocus
          className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-12 py-4 text-white placeholder-gray-600 focus:outline-none focus:border-green-500 transition-colors"
        />
        {loading && (
          <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-gray-500" />
        )}
      </div>

      {/* Tabs */}
      {debouncedQuery.length >= 2 && (
        <div className="flex gap-2 mb-4 overflow-x-auto">
          <TabButton
            active={tab === "usuarios"}
            onClick={() => setTab("usuarios")}
            icon={Users}
            label="Usuarios"
            count={users.length}
          />
          <TabButton
            active={tab === "ligas"}
            onClick={() => setTab("ligas")}
            icon={Trophy}
            label="Ligas"
            count={leagues.length}
          />
        </div>
      )}

      {/* Resultados */}
      {debouncedQuery.length < 2 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
          <Search size={32} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">Escribí al menos 2 caracteres para buscar</p>
        </div>
      ) : tab === "usuarios" ? (
        <section>
          {users.length === 0 && !loading ? (
            <p className="text-gray-500 text-sm text-center py-8">
              No encontré usuarios con &quot;{debouncedQuery}&quot;
            </p>
          ) : (
            <div className="space-y-2">
              {users.map((u) => (
                <Link
                  key={u.id}
                  href={`/u/${u.username}`}
                  className="flex items-center gap-4 bg-white/5 border border-white/10 hover:border-green-500/30 rounded-2xl p-3 transition-colors"
                >
                  <Avatar config={u.avatar_config} username={u.username} size={40} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate">{u.display_name}</p>
                    <p className="text-gray-500 text-xs">@{u.username}</p>
                  </div>
                  <span className="text-green-400 text-xs font-medium">Ver perfil →</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section>
          {leagues.length === 0 && !loading ? (
            <p className="text-gray-500 text-sm text-center py-8">
              No encontré ligas públicas con &quot;{debouncedQuery}&quot;
            </p>
          ) : (
            <div className="space-y-2">
              {leagues.map((l) => (
                <Link
                  key={l.id}
                  href={`/ligas/${l.id}`}
                  className="flex items-center gap-4 bg-white/5 border border-white/10 hover:border-green-500/30 rounded-2xl p-3 transition-colors"
                >
                  <LeagueIcon
                    config={l.config?.icon}
                    name={l.name}
                    id={l.id}
                    bannerColor={l.banner_color}
                    size={48}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-semibold truncate">{l.name}</p>
                      {l.is_verified && <span className="text-yellow-400 text-xs">✓</span>}
                    </div>
                    {l.description && <p className="text-gray-500 text-xs truncate">{l.description}</p>}
                  </div>
                  <span className="text-green-400 text-xs font-medium">UNIRSE</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  )
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  icon: typeof Users
  label: string
  count: number
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors border",
        active
          ? "bg-green-500/15 border-green-500/40 text-white"
          : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"
      )}
    >
      <Icon size={14} />
      {label}
      <span className="bg-white/10 px-1.5 py-0.5 rounded-full text-[10px] tabular-nums">{count}</span>
    </button>
  )
}

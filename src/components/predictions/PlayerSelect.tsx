"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { ChevronDown, Search, X, Check } from "lucide-react"
import { cn } from "@/lib/utils"

type PlayerRow = {
  name: string
  number: number | null
  position: string | null
  team_code: string
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()

export default function PlayerSelect({
  homeCode,
  awayCode,
  homeName,
  awayName,
  value,
  onChange,
}: {
  homeCode: string
  awayCode: string
  homeName: string
  awayName: string
  value: string | undefined
  onChange: (v: string | undefined) => void
}) {
  const [players, setPlayers] = useState<PlayerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const supabase = createClient()
      const { data } = await supabase
        .from("players")
        .select("name, number, position, team_code")
        .in("team_code", [homeCode, awayCode])
        .order("number", { ascending: true })
      if (!cancelled) {
        setPlayers((data ?? []) as PlayerRow[])
        setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [homeCode, awayCode])

  // Cerrar al tocar afuera
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [open])

  const groups = useMemo(() => {
    const nq = norm(q)
    const match = (p: PlayerRow) => !nq || norm(p.name).includes(nq)
    return [
      { code: homeCode, name: homeName, list: players.filter((p) => p.team_code === homeCode && match(p)) },
      { code: awayCode, name: awayName, list: players.filter((p) => p.team_code === awayCode && match(p)) },
    ]
  }, [players, q, homeCode, awayCode, homeName, awayName])

  // Fallback: si no hay planteles cargados todavía, input de texto libre
  if (!loading && players.length === 0) {
    return (
      <input
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        placeholder="Ej: Lionel Messi"
        maxLength={50}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/50"
      />
    )
  }

  const hasResults = groups.some((g) => g.list.length > 0)

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={loading}
        className={cn(
          "w-full flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-left transition-colors",
          "focus:outline-none focus:border-yellow-500/50 hover:border-white/20 disabled:opacity-60"
        )}
      >
        <span className={cn("flex-1 truncate", value ? "text-white" : "text-gray-600")}>
          {loading ? "Cargando jugadores…" : value || "Elegí el goleador"}
        </span>
        {value && !loading && (
          <span
            role="button"
            tabIndex={0}
            aria-label="Limpiar"
            onClick={(e) => {
              e.stopPropagation()
              onChange(undefined)
            }}
            className="shrink-0 text-gray-500 hover:text-white"
          >
            <X size={15} />
          </span>
        )}
        <ChevronDown
          size={16}
          className={cn("shrink-0 text-gray-500 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && !loading && (
        <div className="absolute z-30 mt-1.5 w-full bg-[#101010] border border-white/15 rounded-xl shadow-xl shadow-black/50 overflow-hidden">
          <div className="p-2 border-b border-white/10">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar jugador…"
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/50"
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto overscroll-contain">
            {!hasResults && (
              <p className="text-gray-600 text-xs text-center py-6">
                Sin jugadores que coincidan
              </p>
            )}
            {groups.map(
              (g) =>
                g.list.length > 0 && (
                  <div key={g.code}>
                    <p className="sticky top-0 bg-[#101010] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-500 border-b border-white/5">
                      {g.name}
                    </p>
                    {g.list.map((p) => {
                      const active = value === p.name
                      return (
                        <button
                          key={`${g.code}-${p.name}`}
                          type="button"
                          onClick={() => {
                            onChange(p.name)
                            setOpen(false)
                            setQ("")
                          }}
                          className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors",
                            active ? "bg-yellow-500/15 text-white" : "text-gray-300 hover:bg-white/5"
                          )}
                        >
                          <span className="w-6 shrink-0 text-center text-xs text-gray-500 tabular-nums">
                            {p.number ?? "–"}
                          </span>
                          <span className="flex-1 truncate">{p.name}</span>
                          {p.position && (
                            <span className="shrink-0 text-[10px] text-gray-600 uppercase">
                              {p.position}
                            </span>
                          )}
                          {active && <Check size={14} className="shrink-0 text-yellow-400" />}
                        </button>
                      )
                    })}
                  </div>
                )
            )}
          </div>
        </div>
      )}
    </div>
  )
}

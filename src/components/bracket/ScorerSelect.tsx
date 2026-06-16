"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import TeamFlag from "@/components/TeamFlag"
import { TEAMS } from "@/lib/teams"
import { ChevronDown, Search, X, Check } from "lucide-react"
import { cn } from "@/lib/utils"

type PlayerRow = {
  name: string
  number: number | null
  position: string | null
  team_code: string
}

const ALL_TEAMS = Object.values(TEAMS).sort((a, b) => a.name.localeCompare(b.name))

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim()

/**
 * Selector del goleador del torneo: buscador por nombre + filtro por país,
 * sobre los planteles de las 48 selecciones. Evita errores de ortografía.
 * Si todavía no hay planteles sincronizados, cae a input de texto libre.
 */
export default function ScorerSelect({
  value,
  onChange,
  disabled,
}: {
  value: string | undefined
  onChange: (v: string | undefined) => void
  disabled?: boolean
}) {
  const [players, setPlayers] = useState<PlayerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const [country, setCountry] = useState<string>("") // code FIFA o "" = todos
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from("players")
        .select("name, number, position, team_code")
        .order("name", { ascending: true })
      if (!cancelled) {
        setPlayers((data ?? []) as PlayerRow[])
        setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [open])

  const results = useMemo(() => {
    const nq = norm(q)
    let list = players
    if (country) list = list.filter((p) => p.team_code === country)
    if (nq) list = list.filter((p) => norm(p.name).includes(nq))
    // Sin país y sin búsqueda: no mostramos 1200 jugadores de una
    if (!country && !nq) return []
    return list.slice(0, 60)
  }, [players, q, country])

  // Fallback: planteles aún no cargados → texto libre
  if (!loading && players.length === 0) {
    return (
      <input
        type="text"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        placeholder="Ej: Lionel Messi"
        disabled={disabled}
        maxLength={60}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/50 transition-colors disabled:opacity-50"
      />
    )
  }

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled || loading}
        className={cn(
          "w-full flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-left transition-colors",
          "focus:outline-none focus:border-yellow-500/50 hover:border-white/20 disabled:opacity-50"
        )}
      >
        <span className={cn("flex-1 truncate", value ? "text-white" : "text-gray-600")}>
          {loading ? "Cargando jugadores…" : value || "Elegí el goleador"}
        </span>
        {value && !loading && !disabled && (
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
            <X size={16} />
          </span>
        )}
        <ChevronDown size={16} className={cn("shrink-0 text-gray-500 transition-transform", open && "rotate-180")} />
      </button>

      {open && !loading && (
        <div className="absolute z-30 mt-1.5 w-full bg-[#101010] border border-white/15 rounded-xl shadow-xl shadow-black/50 overflow-hidden">
          {/* Filtros */}
          <div className="p-2 border-b border-white/10 space-y-2">
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500/50"
            >
              <option value="">Todos los países</option>
              {ALL_TEAMS.map((t) => (
                <option key={t.fifaCode} value={t.fifaCode}>
                  {t.name}
                </option>
              ))}
            </select>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar jugador por nombre…"
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/50"
              />
            </div>
          </div>

          {/* Resultados */}
          <div className="max-h-64 overflow-y-auto overscroll-contain">
            {results.length === 0 ? (
              <p className="text-gray-600 text-xs text-center py-6 px-3">
                {country || q ? "Sin jugadores que coincidan" : "Elegí un país o buscá por nombre"}
              </p>
            ) : (
              results.map((p) => {
                const active = value === p.name
                const team = TEAMS[p.team_code]
                return (
                  <button
                    key={`${p.team_code}-${p.name}`}
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
                    <TeamFlag code={p.team_code} size={18} />
                    <span className="flex-1 truncate">{p.name}</span>
                    <span className="shrink-0 text-[10px] text-gray-600 uppercase">
                      {team?.fifaCode ?? p.team_code}
                    </span>
                    {active && <Check size={14} className="shrink-0 text-yellow-400" />}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

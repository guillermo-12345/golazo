"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import TeamFlag from "@/components/TeamFlag"
import { MapPin, Check, Radio, CalendarClock } from "lucide-react"
import type { Match } from "@/types/database"
import { isPredictionLocked } from "@/lib/predictions"

const STAGE_LABEL: Record<string, string> = {
  group_stage: "Grupos",
  round_of_32: "16avos",
  round_of_16: "Octavos",
  quarter_final: "Cuartos",
  semi_final: "Semis",
  third_place: "3er puesto",
  final: "Final",
}
const STAGE_ACCENT: Record<string, string> = {
  group_stage: "#6b7280",
  round_of_32: "#3b82f6",
  round_of_16: "#06b6d4",
  quarter_final: "#a855f7",
  semi_final: "#ec4899",
  third_place: "#f97316",
  final: "#facc15",
}

type Filter = "all" | "live" | "todo"

/** yyyy-MM-dd del día del partido en la zona local del navegador. */
function localDayKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export default function CalendarView({
  matches,
  predictedIds,
}: {
  matches: Match[]
  predictedIds: string[]
}) {
  const [mounted, setMounted] = useState(false)
  const [filter, setFilter] = useState<Filter>("all")
  const [selectedDay, setSelectedDay] = useState<string>("")
  const stripRef = useRef<HTMLDivElement>(null)
  const predicted = useMemo(() => new Set(predictedIds), [predictedIds])

  // Días con sus partidos (en TZ local) — solo tras el mount para evitar
  // desajustes de hidratación por zona horaria.
  const days = useMemo(() => {
    if (!mounted) return []
    const map = new Map<string, Match[]>()
    for (const m of matches) {
      const k = localDayKey(m.scheduled_at)
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(m)
    }
    return [...map.entries()]
      .map(([key, list]) => ({
        key,
        list,
        live: list.some((m) => m.status === "live"),
      }))
      .sort((a, b) => a.key.localeCompare(b.key))
  }, [matches, mounted])

  const liveMatches = useMemo(() => matches.filter((m) => m.status === "live"), [matches])
  const pendingMatches = useMemo(
    () => matches.filter((m) => !predicted.has(m.id) && !isPredictionLocked(m.scheduled_at, m.status) && m.home_team_code !== "TBD"),
    [matches, predicted]
  )

  // Día por defecto: hoy si hay, si no el próximo con partidos
  useEffect(() => {
    setMounted(true)
  }, [])
  useEffect(() => {
    if (!mounted || days.length === 0 || selectedDay) return
    const today = localDayKey(new Date().toISOString())
    const pick = days.find((d) => d.key === today) ?? days.find((d) => d.key >= today) ?? days[days.length - 1]
    setSelectedDay(pick.key)
  }, [mounted, days, selectedDay])

  // Centrar el día seleccionado en la tira
  useEffect(() => {
    if (!selectedDay || !stripRef.current) return
    const el = stripRef.current.querySelector(`[data-day="${selectedDay}"]`)
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })
  }, [selectedDay])

  if (!mounted) {
    return <div className="h-40 rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
  }

  const shown =
    filter === "live"
      ? liveMatches
      : filter === "todo"
      ? pendingMatches
      : days.find((d) => d.key === selectedDay)?.list ?? []

  return (
    <div>
      {/* Filtros rápidos */}
      <div className="flex gap-2 mb-3">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
          <CalendarClock size={13} /> Por día
        </FilterChip>
        <FilterChip active={filter === "live"} onClick={() => setFilter("live")} disabled={liveMatches.length === 0}>
          <span className="relative flex h-1.5 w-1.5">
            {liveMatches.length > 0 && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            )}
            <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${liveMatches.length ? "bg-red-500" : "bg-gray-600"}`} />
          </span>
          En vivo {liveMatches.length > 0 && `(${liveMatches.length})`}
        </FilterChip>
        <FilterChip active={filter === "todo"} onClick={() => setFilter("todo")} disabled={pendingMatches.length === 0}>
          <Check size={13} /> Por predecir {pendingMatches.length > 0 && `(${pendingMatches.length})`}
        </FilterChip>
      </div>

      {/* Tira de días (solo en modo "Por día") */}
      {filter === "all" && (
        <div ref={stripRef} className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1 snap-x">
          {days.map((d) => {
            const [y, mo, dd] = d.key.split("-").map(Number)
            const date = new Date(y, mo - 1, dd, 12)
            const sel = d.key === selectedDay
            return (
              <button
                key={d.key}
                data-day={d.key}
                onClick={() => setSelectedDay(d.key)}
                className={`snap-center shrink-0 w-[52px] flex flex-col items-center gap-0.5 py-2 rounded-xl border transition-colors relative ${
                  sel
                    ? "bg-green-500 border-green-500 text-black"
                    : "bg-white/5 border-white/10 text-gray-300 hover:border-white/20"
                }`}
              >
                <span className="text-[9px] font-bold uppercase opacity-70 leading-none">
                  {format(date, "EEE", { locale: es })}
                </span>
                <span className="text-lg font-black leading-none">{dd}</span>
                <span className="text-[9px] uppercase opacity-70 leading-none">
                  {format(date, "MMM", { locale: es })}
                </span>
                {d.live ? (
                  <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-red-500" />
                ) : (
                  <span className={`absolute -bottom-0.5 text-[8px] font-bold ${sel ? "text-black/50" : "text-gray-600"}`}>
                    {d.list.length}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Encabezado del día */}
      {filter === "all" && selectedDay && (
        <h2 className="text-white font-bold text-sm mb-3 capitalize">
          {(() => {
            const [y, mo, dd] = selectedDay.split("-").map(Number)
            return format(new Date(y, mo - 1, dd, 12), "EEEE d 'de' MMMM", { locale: es })
          })()}
        </h2>
      )}

      {shown.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center text-gray-500 text-sm">
          {filter === "live" ? "No hay partidos en vivo ahora." : filter === "todo" ? "¡Estás al día! Sin partidos pendientes." : "Sin partidos este día."}
        </div>
      ) : (
        <div className="space-y-2.5">
          {shown.map((m) => (
            <MatchRow key={m.id} m={m} predicted={predicted.has(m.id)} showDay={filter !== "all"} />
          ))}
        </div>
      )}
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors disabled:opacity-40 ${
        active ? "bg-white/10 border-white/25 text-white" : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"
      }`}
    >
      {children}
    </button>
  )
}

function MatchRow({ m, predicted, showDay }: { m: Match; predicted: boolean; showDay: boolean }) {
  const finished = m.status === "finished"
  const live = m.status === "live"
  const accent = STAGE_ACCENT[m.stage] ?? "#6b7280"
  const locked = isPredictionLocked(m.scheduled_at, m.status)
  const canPredict = !locked && !predicted && m.home_team_code !== "TBD"
  const time = new Date(m.scheduled_at)
  const timeStr = time.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })
  const dayStr = time.toLocaleDateString("es", { day: "numeric", month: "short" })

  return (
    <Link
      href={`/partidos/${m.id}`}
      className={`block rounded-2xl border overflow-hidden transition-colors ${
        live ? "border-red-500/40 bg-red-500/[0.04]" : "border-white/10 bg-white/[0.04] hover:border-green-500/30"
      }`}
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      <div className="p-3.5">
        <div className="flex items-center justify-between mb-2.5 text-[11px]">
          <span className="font-bold uppercase tracking-wider" style={{ color: accent }}>
            {STAGE_LABEL[m.stage] ?? m.stage}
            {m.group_name && <span className="text-gray-500"> · {m.group_name}</span>}
          </span>
          <span className="text-gray-400 font-mono flex items-center gap-1.5">
            {showDay && <span className="text-gray-600">{dayStr}</span>}
            {live ? <span className="text-red-400 font-bold">EN VIVO</span> : timeStr}
          </span>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="flex items-center gap-2 justify-end min-w-0">
            <span className="text-white font-bold text-sm truncate text-right">{m.home_team}</span>
            <TeamFlag code={m.home_team_code} size={30} />
          </div>
          <div className="shrink-0 min-w-[52px] text-center">
            {finished || live ? (
              <span className={`text-xl font-black tabular-nums ${live ? "text-red-400" : "text-white"}`}>
                {m.home_score ?? 0}-{m.away_score ?? 0}
              </span>
            ) : (
              <span className="text-gray-600 text-sm font-bold">vs</span>
            )}
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <TeamFlag code={m.away_team_code} size={30} />
            <span className="text-white font-bold text-sm truncate">{m.away_team}</span>
          </div>
        </div>

        <div className="flex items-center justify-between mt-2.5 text-[10px]">
          <span className="flex items-center gap-1 text-gray-600 min-w-0">
            {m.venue && (
              <>
                <MapPin size={10} className="shrink-0" />
                <span className="truncate">{m.venue}</span>
              </>
            )}
          </span>
          {predicted ? (
            <span className="flex items-center gap-1 text-green-400 font-bold shrink-0">
              <Check size={11} /> Predicho
            </span>
          ) : canPredict ? (
            <span className="flex items-center gap-1 text-green-400 font-bold shrink-0">
              <Radio size={10} /> Predecir →
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  )
}

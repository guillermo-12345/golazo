"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { RefreshCw, Loader2, Check, Pencil, Search, Users, Calculator, ClipboardList } from "lucide-react"

export default function AdminTools() {
  const [syncing, setSyncing] = useState<string | null>(null)
  const [syncResult, setSyncResult] = useState<string | null>(null)

  // Sync de planteles (jugadores)
  const [syncingPlayers, setSyncingPlayers] = useState(false)
  const [playersResult, setPlayersResult] = useState<string | null>(null)

  // Recálculo de puntos
  const [recalculating, setRecalculating] = useState(false)
  const [recalcResult, setRecalcResult] = useState<string | null>(null)

  // Estado de predicciones por partido
  const [psMatches, setPsMatches] = useState<Array<{ id: string; home_team: string; away_team: string; scheduled_at: string }>>([])
  const [psSelected, setPsSelected] = useState<string>("")
  const [psLoading, setPsLoading] = useState(false)
  const [psResult, setPsResult] = useState<{ predicted: string[]; missing: string[] } | null>(null)

  // Cargar resultado manual
  const [query, setQuery] = useState("")
  const [matches, setMatches] = useState<Array<{ id: string; home_team: string; away_team: string; home_team_code: string; away_team_code: string; status: string }>>([])
  const [selected, setSelected] = useState<{ id: string; home_team: string; away_team: string } | null>(null)
  const [hScore, setHScore] = useState(0)
  const [aScore, setAScore] = useState(0)
  const [savingMatch, setSavingMatch] = useState(false)
  const [matchSaved, setMatchSaved] = useState(false)

  async function triggerSync(mode: "full" | "live" | "espn" | "espn-full") {
    setSyncing(mode)
    setSyncResult(null)
    try {
      const res = await fetch(`/api/admin/trigger-sync?mode=${mode}`, { method: "POST" })
      const data = await res.json()
      setSyncResult(JSON.stringify(data))
    } catch {
      setSyncResult("Error al sincronizar")
    }
    setSyncing(null)
  }

  async function syncPlayers() {
    setSyncingPlayers(true)
    setPlayersResult(null)
    try {
      // ESPN: planteles oficiales del Mundial (26 convocados por selección)
      const res = await fetch(`/api/admin/sync-players`, { method: "POST" })
      const data = await res.json()
      setPlayersResult(JSON.stringify(data))
    } catch {
      setPlayersResult("Error al sincronizar planteles")
    }
    setSyncingPlayers(false)
  }

  // Cargar próximos partidos (ventana ±3 días) para el selector de estado
  useEffect(() => {
    async function loadMatches() {
      const supabase = createClient()
      const from = new Date(Date.now() - 2 * 86400000).toISOString()
      const to = new Date(Date.now() + 5 * 86400000).toISOString()
      const { data } = await supabase
        .from("matches")
        .select("id, home_team, away_team, scheduled_at")
        .gte("scheduled_at", from)
        .lte("scheduled_at", to)
        .order("scheduled_at", { ascending: true })
      const list = (data ?? []) as typeof psMatches
      setPsMatches(list)
      if (list.length > 0) setPsSelected(list[0].id)
    }
    loadMatches()
  }, [])

  async function loadPredictionStatus(matchId: string) {
    if (!matchId) return
    setPsLoading(true)
    setPsResult(null)
    try {
      const res = await fetch(`/api/admin/prediction-status?match=${matchId}`, { method: "GET" })
      const data = await res.json()
      if (data.ok) setPsResult({ predicted: data.predicted, missing: data.missing })
    } catch {
      // noop
    }
    setPsLoading(false)
  }

  async function recalculate() {
    setRecalculating(true)
    setRecalcResult(null)
    try {
      const res = await fetch(`/api/admin/recalculate`, { method: "POST" })
      const data = await res.json()
      setRecalcResult(JSON.stringify(data))
    } catch {
      setRecalcResult("Error al recalcular")
    }
    setRecalculating(false)
  }

  async function searchMatches() {
    if (query.length < 2) return
    const supabase = createClient()
    const { data } = await supabase
      .from("matches")
      .select("id, home_team, away_team, home_team_code, away_team_code, status")
      .or(`home_team.ilike.%${query}%,away_team.ilike.%${query}%`)
      .limit(10)
    setMatches((data ?? []) as typeof matches)
  }

  async function saveMatchResult() {
    if (!selected) return
    setSavingMatch(true)
    const res = await fetch("/api/admin/update-match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matchId: selected.id,
        homeScore: hScore,
        awayScore: aScore,
        status: "finished",
      }),
    })
    if (res.ok) {
      setMatchSaved(true)
      setTimeout(() => {
        setMatchSaved(false)
        setSelected(null)
        setMatches([])
        setQuery("")
      }, 2000)
    }
    setSavingMatch(false)
  }

  return (
    <div className="space-y-6">
      {/* Sincronización */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <RefreshCw size={18} className="text-green-400" />
          <h2 className="text-lg font-bold text-white">Sincronización de resultados</h2>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-gray-500 text-xs mb-3">
            <span className="text-green-400 font-bold">ESPN</span> trae calendario real y
            marcadores gratis (recomendado mientras API-Football siga en plan free).
            El sync ESPN cubre ayer/hoy/mañana; el completo, toda la fase de grupos.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => triggerSync("espn")}
              disabled={syncing !== null}
              className="flex items-center gap-2 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-bold px-4 py-2.5 rounded-xl text-sm transition-colors"
            >
              {syncing === "espn" ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Sync ESPN (hoy)
            </button>
            <button
              onClick={() => triggerSync("espn-full")}
              disabled={syncing !== null}
              className="flex items-center gap-2 bg-green-500/20 hover:bg-green-500/30 disabled:opacity-50 text-green-300 font-bold px-4 py-2.5 rounded-xl text-sm transition-colors border border-green-500/30"
            >
              {syncing === "espn-full" ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Sync ESPN completo
            </button>
            <button
              onClick={() => triggerSync("full")}
              disabled={syncing !== null}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors"
            >
              {syncing === "full" ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              API-Football
            </button>
            <button
              onClick={() => triggerSync("live")}
              disabled={syncing !== null}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors"
            >
              {syncing === "live" ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              API-Football en vivo
            </button>
          </div>
          {syncResult && (
            <pre className="mt-3 bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-green-300 overflow-x-auto">
              {syncResult}
            </pre>
          )}
        </div>
      </section>

      {/* Sync de planteles */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Users size={18} className="text-blue-400" />
          <h2 className="text-lg font-bold text-white">Sync de planteles (jugadores)</h2>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-gray-500 text-xs mb-3">
            Trae los <span className="text-blue-300 font-bold">planteles oficiales del Mundial desde ESPN</span>{" "}
            (los 26 convocados de cada selección, con dorsal y posición) y
            reemplaza los planteles viejos. Un solo toque sincroniza los 48
            equipos. Usalo de nuevo si alguna federación cambia un convocado.
          </p>
          <button
            onClick={syncPlayers}
            disabled={syncingPlayers}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-black font-bold px-4 py-2.5 rounded-xl text-sm transition-colors"
          >
            {syncingPlayers ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} />}
            Sincronizar planteles oficiales (48)
          </button>
          {playersResult && (
            <pre className="mt-3 bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-blue-300 overflow-x-auto">
              {playersResult}
            </pre>
          )}
        </div>
      </section>

      {/* Recálculo de puntos */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Calculator size={18} className="text-purple-400" />
          <h2 className="text-lg font-bold text-white">Recalcular puntos</h2>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-gray-500 text-xs mb-3">
            Recalcula los puntos de <span className="text-purple-300 font-bold">todos los partidos terminados</span>{" "}
            desde cero (básicos + avanzados), con las reglas actuales y el
            extra_data ya cargado. Es seguro: no duplica notificaciones ni
            puntos. Útil tras cambiar reglas o cuando las estadísticas
            llegaron después del primer cálculo.
          </p>
          <button
            onClick={recalculate}
            disabled={recalculating}
            className="flex items-center gap-2 bg-purple-500 hover:bg-purple-400 disabled:opacity-50 text-black font-bold px-4 py-2.5 rounded-xl text-sm transition-colors"
          >
            {recalculating ? <Loader2 size={14} className="animate-spin" /> : <Calculator size={14} />}
            Recalcular todos los puntos
          </button>
          {recalcResult && (
            <pre className="mt-3 bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-purple-300 overflow-x-auto">
              {recalcResult}
            </pre>
          )}
        </div>
      </section>

      {/* Estado de predicciones por partido */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <ClipboardList size={18} className="text-cyan-400" />
          <h2 className="text-lg font-bold text-white">¿Quién predijo?</h2>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-gray-500 text-xs mb-3">
            Mirá quién ya hizo su predicción para un partido y a quién le falta
            (sobre la Liga Global, donde están todos).
          </p>
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <select
              value={psSelected}
              onChange={(e) => setPsSelected(e.target.value)}
              className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50"
            >
              {psMatches.length === 0 && <option value="">Sin partidos próximos</option>}
              {psMatches.map((m) => (
                <option key={m.id} value={m.id} className="bg-[#111]">
                  {m.home_team} vs {m.away_team} · {new Date(m.scheduled_at).toLocaleDateString("es", { day: "numeric", month: "short" })}
                </option>
              ))}
            </select>
            <button
              onClick={() => loadPredictionStatus(psSelected)}
              disabled={psLoading || !psSelected}
              className="flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-bold px-4 py-2.5 rounded-xl text-sm transition-colors shrink-0"
            >
              {psLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              Ver
            </button>
          </div>

          {psResult && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-3">
                <p className="text-green-400 text-xs font-bold mb-2 uppercase tracking-wider">
                  Ya predijeron ({psResult.predicted.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {psResult.predicted.length === 0 ? (
                    <span className="text-gray-600 text-xs">Nadie todavía</span>
                  ) : (
                    psResult.predicted.map((n) => (
                      <span key={n} className="bg-green-500/10 text-green-300 text-xs px-2 py-1 rounded-lg">{n}</span>
                    ))
                  )}
                </div>
              </div>
              <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3">
                <p className="text-red-400 text-xs font-bold mb-2 uppercase tracking-wider">
                  Faltan ({psResult.missing.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {psResult.missing.length === 0 ? (
                    <span className="text-gray-600 text-xs">¡Todos predijeron! 🎉</span>
                  ) : (
                    psResult.missing.map((n) => (
                      <span key={n} className="bg-red-500/10 text-red-300 text-xs px-2 py-1 rounded-lg">{n}</span>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Cargar resultado manual */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Pencil size={18} className="text-yellow-400" />
          <h2 className="text-lg font-bold text-white">Cargar resultado a mano</h2>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-gray-500 text-xs mb-3">
            Si la API falla, podés poner el resultado manualmente. Esto recalcula
            los puntos automáticamente.
          </p>

          {!selected ? (
            <>
              <div className="flex gap-2 mb-3">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && searchMatches()}
                    placeholder="Buscar partido por equipo..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/50"
                  />
                </div>
                <button
                  onClick={searchMatches}
                  className="bg-white/10 hover:bg-white/15 text-white text-sm font-medium px-4 rounded-xl"
                >
                  Buscar
                </button>
              </div>
              <div className="space-y-1.5">
                {matches.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelected(m)}
                    className="w-full flex items-center justify-between bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-left transition-colors"
                  >
                    <span className="text-white">
                      {m.home_team} vs {m.away_team}
                    </span>
                    <span className="text-gray-600 text-xs">{m.status}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div>
              <p className="text-white font-bold text-sm mb-4 text-center">
                {selected.home_team} vs {selected.away_team}
              </p>
              <div className="flex items-center justify-center gap-4 mb-4">
                <ScoreBox value={hScore} onChange={setHScore} label={selected.home_team} />
                <span className="text-gray-500 text-2xl">·</span>
                <ScoreBox value={aScore} onChange={setAScore} label={selected.away_team} />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelected(null)}
                  className="flex-1 bg-white/10 hover:bg-white/15 text-white text-sm font-medium py-2.5 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveMatchResult}
                  disabled={savingMatch}
                  className="flex-1 flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black text-sm font-bold py-2.5 rounded-xl"
                >
                  {savingMatch && <Loader2 size={14} className="animate-spin" />}
                  {matchSaved && <Check size={14} />}
                  {matchSaved ? "¡Guardado!" : "Guardar resultado"}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function ScoreBox({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="text-center">
      <p className="text-gray-500 text-[10px] mb-1 max-w-[80px] truncate">{label}</p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          className="w-7 h-7 rounded-full bg-white/5 border border-white/10 text-gray-400 text-sm"
        >
          −
        </button>
        <div className="w-12 h-12 bg-yellow-500/10 border-2 border-yellow-500/30 rounded-xl flex items-center justify-center">
          <span className="text-2xl font-black text-white">{value}</span>
        </div>
        <button
          onClick={() => onChange(Math.min(20, value + 1))}
          className="w-7 h-7 rounded-full bg-white/5 border border-white/10 text-gray-400 text-sm"
        >
          +
        </button>
      </div>
    </div>
  )
}

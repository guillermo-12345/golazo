"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Loader2, Lock, Check, Sparkles, Minus, Plus } from "lucide-react"
import type { Match } from "@/types/database"

type LeagueForPrediction = {
  id: string
  name: string
  banner_color: string
  config: {
    advancedOptions: {
      enabled: boolean
      firstScorer: boolean
      goalMinute: boolean
      yellowCards: boolean
      redCards: boolean
      corners: boolean
      firstTeamToScore: boolean
      halftimeResult: boolean
    }
  }
}

type ExistingPred = {
  league_id: string
  home_score_pred: number
  away_score_pred: number
  advanced_picks: Record<string, unknown>
  points_wagered: number
  wildcard_used: string | null
}

export default function PredictionForm({
  match,
  leagues,
  existingPreds,
  isLocked,
}: {
  match: Match
  leagues: LeagueForPrediction[]
  existingPreds: ExistingPred[]
  isLocked: boolean
}) {
  const router = useRouter()
  const [selectedLeagueId, setSelectedLeagueId] = useState(leagues[0].id)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const existing = existingPreds.find((p) => p.league_id === selectedLeagueId)
  const [homeScore, setHomeScore] = useState(existing?.home_score_pred ?? 0)
  const [awayScore, setAwayScore] = useState(existing?.away_score_pred ?? 0)
  const [wildcard, setWildcard] = useState<string | null>(existing?.wildcard_used ?? null)

  const selectedLeague = leagues.find((l) => l.id === selectedLeagueId)!

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from("predictions").upsert(
      {
        user_id: user.id,
        match_id: match.id,
        league_id: selectedLeagueId,
        home_score_pred: homeScore,
        away_score_pred: awayScore,
        wildcard_used: wildcard,
        advanced_picks: {},
        points_wagered: 0,
      },
      { onConflict: "user_id,match_id,league_id" }
    )

    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      router.refresh()
    }
    setSaving(false)
  }

  const handleLeagueChange = (leagueId: string) => {
    setSelectedLeagueId(leagueId)
    const ex = existingPreds.find((p) => p.league_id === leagueId)
    setHomeScore(ex?.home_score_pred ?? 0)
    setAwayScore(ex?.away_score_pred ?? 0)
    setWildcard(ex?.wildcard_used ?? null)
  }

  if (isLocked) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
        <Lock size={24} className="text-gray-500 mx-auto mb-3" />
        <p className="text-gray-300 font-medium">Las predicciones están cerradas</p>
        <p className="text-gray-500 text-sm mt-1">Este partido ya empezó</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Selector de liga */}
      {leagues.length > 1 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            Predecir para:
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {leagues.map((l) => {
              const hasPred = existingPreds.some((p) => p.league_id === l.id)
              return (
                <button
                  key={l.id}
                  onClick={() => handleLeagueChange(l.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors border ${
                    selectedLeagueId === l.id
                      ? "bg-green-500/20 border-green-500/50 text-white"
                      : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: l.banner_color }}
                  />
                  {l.name}
                  {hasPred && <Check size={12} className="text-green-400" />}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Predicción de score */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 text-center">
          Tu predicción
        </p>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <ScoreInput value={homeScore} onChange={setHomeScore} label={match.home_team_code} />
          <span className="text-3xl text-gray-500">·</span>
          <ScoreInput value={awayScore} onChange={setAwayScore} label={match.away_team_code} />
        </div>

        {/* Puntaje estimado */}
        <div className="mt-6 pt-6 border-t border-white/10">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Puntos si acertás exacto</span>
            <span className="text-green-400 font-bold">+5 pts</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-gray-400">Si solo acertás el ganador</span>
            <span className="text-green-400 font-bold">+1 pt</span>
          </div>
        </div>
      </div>

      {/* Comodines */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={14} className="text-yellow-400" />
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Comodín</p>
          <span className="text-xs text-gray-600">(opcional)</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <WildcardButton
            label="Todo o Nada"
            description="x2 si acertás · -2 si fallás"
            active={wildcard === "todo_o_nada"}
            onClick={() => setWildcard(wildcard === "todo_o_nada" ? null : "todo_o_nada")}
            color="#ef4444"
          />
          <WildcardButton
            label="Escudo"
            description="Protege puntos avanzados"
            active={wildcard === "escudo"}
            onClick={() => setWildcard(wildcard === "escudo" ? null : "escudo")}
            color="#3b82f6"
          />
          <WildcardButton
            label="Ladrón"
            description="Robá 2 pts al líder"
            active={wildcard === "ladron"}
            onClick={() => setWildcard(wildcard === "ladron" ? null : "ladron")}
            color="#a855f7"
          />
        </div>
      </div>

      {/* Avanzadas */}
      {selectedLeague.config.advancedOptions?.enabled && (
        <div className="bg-gradient-to-br from-yellow-500/5 to-orange-500/5 border border-yellow-500/20 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className="text-yellow-400" />
            <p className="text-sm font-bold text-yellow-400">Opciones avanzadas</p>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Próximamente — predicciones extra que multiplican tus puntos
          </p>
        </div>
      )}

      {/* Guardar */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 disabled:opacity-60 text-black font-black py-4 rounded-xl transition-colors"
      >
        {saving && <Loader2 size={18} className="animate-spin" />}
        {saved && <Check size={18} />}
        {saving ? "Guardando..." : saved ? "¡Predicción guardada!" : existing ? "Actualizar predicción" : "Guardar predicción"}
      </button>
    </div>
  )
}

function ScoreInput({
  value,
  onChange,
  label,
}: {
  value: number
  onChange: (v: number) => void
  label: string
}) {
  return (
    <div className="text-center">
      <p className="text-gray-500 text-xs mb-2 font-bold">{label}</p>
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors"
        >
          <Minus size={14} className="text-gray-400" />
        </button>
        <div className="w-14 h-14 bg-green-500/10 border-2 border-green-500/30 rounded-2xl flex items-center justify-center">
          <span className="text-3xl font-black text-white">{value}</span>
        </div>
        <button
          onClick={() => onChange(Math.min(20, value + 1))}
          className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors"
        >
          <Plus size={14} className="text-gray-400" />
        </button>
      </div>
    </div>
  )
}

function WildcardButton({
  label,
  description,
  active,
  onClick,
  color,
}: {
  label: string
  description: string
  active: boolean
  onClick: () => void
  color: string
}) {
  return (
    <button
      onClick={onClick}
      className="p-3 rounded-xl border-2 transition-all text-center"
      style={{
        backgroundColor: active ? color + "22" : "rgba(255,255,255,0.05)",
        borderColor: active ? color + "88" : "rgba(255,255,255,0.1)",
      }}
    >
      <p className="text-white text-xs font-bold mb-0.5">{label}</p>
      <p className="text-gray-500 text-[10px] leading-tight">{description}</p>
    </button>
  )
}

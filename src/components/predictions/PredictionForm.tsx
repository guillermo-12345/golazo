"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Loader2, Lock, Check, Sparkles, Minus, Plus, ChevronDown } from "lucide-react"
import type { Match } from "@/types/database"
import { cn } from "@/lib/utils"
import PlayerSelect from "./PlayerSelect"
import LocalDateTime from "@/components/LocalDateTime"
import { PREDICTION_LOCK_MINUTES, predictionLockTime } from "@/lib/predictions"
import { ADVANCED_POINTS, BASIC_POINTS } from "@/lib/scoring-values"

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
      possession?: boolean
      totalShots?: boolean
      totalFouls?: boolean
    }
    multipliers?: {
      exactScore: number
      correctWinner: number
      correctDraw: number
      winnerWithDiff: number
    }
    allowWildcards?: boolean
  }
}

type AdvancedPicks = {
  firstScorer?: string
  firstTeamToScore?: "home" | "away"
  goalMinute?: string
  halftimeResult?: string
  totalYellowCards?: string
  anyRedCard?: "yes" | "no"
  totalCorners?: string
  morePossession?: "home" | "away"
  totalShots?: string
  totalFouls?: string
}

type ExistingPred = {
  league_id: string
  home_score_pred: number
  away_score_pred: number
  advanced_picks: AdvancedPicks
  points_wagered: number
  wildcard_used: string | null
}

const MINUTE_RANGES = ["0-15", "16-30", "31-45", "46-60", "61-75", "76-90"]
const YELLOW_RANGES = ["0-3", "4-6", "7-9", "10-12", "13-20"]
const CORNER_RANGES = ["0-5", "6-10", "11-15", "16-20"]
const SHOT_RANGES = ["0-10", "11-20", "21-30", "31-50"]
const FOUL_RANGES = ["0-15", "16-25", "26-35", "36-50"]

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
  const [savedCount, setSavedCount] = useState(1)
  const [applyAll, setApplyAll] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [advancedExpanded, setAdvancedExpanded] = useState(false)

  const existing = existingPreds.find((p) => p.league_id === selectedLeagueId)
  const [homeScore, setHomeScore] = useState(existing?.home_score_pred ?? 0)
  const [awayScore, setAwayScore] = useState(existing?.away_score_pred ?? 0)
  const [wildcard, setWildcard] = useState<string | null>(existing?.wildcard_used ?? null)
  const [picks, setPicks] = useState<AdvancedPicks>(existing?.advanced_picks ?? {})

  const selectedLeague = leagues.find((l) => l.id === selectedLeagueId)!
  const adv = selectedLeague.config.advancedOptions
  const mult = selectedLeague.config.multipliers ?? BASIC_POINTS
  const hasAnyAdvanced =
    adv?.enabled &&
    (adv.firstScorer || adv.firstTeamToScore || adv.goalMinute || adv.halftimeResult ||
      adv.yellowCards || adv.redCards || adv.corners || adv.possession ||
      adv.totalShots || adv.totalFouls)

  // Filtra los picks avanzados según las opciones habilitadas en cada liga
  // (al guardar en todas, una liga sin córners no debe recibir ese pick).
  function picksForLeague(league: LeagueForPrediction): AdvancedPicks {
    const a = league.config.advancedOptions
    if (!a?.enabled) return {}
    const flagByPick: Record<keyof AdvancedPicks, boolean | undefined> = {
      firstScorer: a.firstScorer,
      firstTeamToScore: a.firstTeamToScore,
      goalMinute: a.goalMinute,
      halftimeResult: a.halftimeResult,
      totalYellowCards: a.yellowCards,
      anyRedCard: a.redCards,
      totalCorners: a.corners,
      morePossession: a.possession,
      totalShots: a.totalShots,
      totalFouls: a.totalFouls,
    }
    const out: AdvancedPicks = {}
    for (const key of Object.keys(picks) as Array<keyof AdvancedPicks>) {
      if (flagByPick[key]) {
        Object.assign(out, { [key]: picks[key] })
      }
    }
    return out
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSaving(false)
      return
    }

    const targetLeagues = applyAll && leagues.length > 1 ? leagues : [selectedLeague]
    const rows = targetLeagues.map((l) => ({
      user_id: user.id,
      match_id: match.id,
      league_id: l.id,
      home_score_pred: homeScore,
      away_score_pred: awayScore,
      // El comodín solo va a ligas que los permiten
      wildcard_used: l.config.allowWildcards !== false ? wildcard : null,
      advanced_picks: picksForLeague(l),
      points_wagered: 0,
    }))

    const { error } = await supabase
      .from("predictions")
      .upsert(rows, { onConflict: "user_id,match_id,league_id" })

    if (!error) {
      setSavedCount(targetLeagues.length)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      router.refresh()
    } else if (error.code === "42501") {
      // RLS rechazó la escritura: el corte de 65 min ya pasó
      setSaveError(
        `Las predicciones de este partido ya cerraron (${PREDICTION_LOCK_MINUTES} min antes del inicio).`
      )
      router.refresh()
    } else {
      setSaveError("No se pudo guardar la predicción. Intentá de nuevo.")
    }
    setSaving(false)
  }

  const handleLeagueChange = (leagueId: string) => {
    setSelectedLeagueId(leagueId)
    const ex = existingPreds.find((p) => p.league_id === leagueId)
    setHomeScore(ex?.home_score_pred ?? 0)
    setAwayScore(ex?.away_score_pred ?? 0)
    setWildcard(ex?.wildcard_used ?? null)
    setPicks(ex?.advanced_picks ?? {})
  }

  function updatePick<K extends keyof AdvancedPicks>(key: K, value: AdvancedPicks[K] | undefined) {
    setPicks((p) => {
      const next = { ...p }
      if (value === undefined || value === "") delete next[key]
      else next[key] = value
      return next
    })
  }

  if (isLocked) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
        <Lock size={24} className="text-gray-500 mx-auto mb-3" />
        <p className="text-gray-300 font-medium">Las predicciones están cerradas</p>
        <p className="text-gray-500 text-sm mt-1">
          Cierran {PREDICTION_LOCK_MINUTES} minutos antes del inicio, cuando se
          conocen las alineaciones
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Aviso de cierre anticipado */}
      <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500">
        <Lock size={11} className="shrink-0" />
        <span>
          Cerrá tu predicción antes de las{" "}
          <LocalDateTime
            date={predictionLockTime(match.scheduled_at)}
            formatStr="HH:mm 'del' d MMM"
            className="text-gray-300 font-medium"
          />{" "}
          ({PREDICTION_LOCK_MINUTES}&apos; antes del partido)
        </span>
      </div>

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
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors border",
                    selectedLeagueId === l.id
                      ? "bg-green-500/20 border-green-500/50 text-white"
                      : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"
                  )}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: l.banner_color }} />
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

        <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center justify-between text-gray-400">
            <span>Exacto</span>
            <span className="text-green-400 font-bold">+{mult.exactScore}</span>
          </div>
          <div className="flex items-center justify-between text-gray-400">
            <span>Ganador + diferencia</span>
            <span className="text-green-400 font-bold">+{mult.winnerWithDiff}</span>
          </div>
          <div className="flex items-center justify-between text-gray-400">
            <span>Empate (no exacto)</span>
            <span className="text-green-400 font-bold">+{mult.correctDraw}</span>
          </div>
          <div className="flex items-center justify-between text-gray-400">
            <span>Solo ganador</span>
            <span className="text-green-400 font-bold">+{mult.correctWinner}</span>
          </div>
        </div>
      </div>

      {/* Comodines — solo si la liga los permite */}
      {selectedLeague.config.allowWildcards !== false && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={14} className="text-yellow-400" />
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Comodín</p>
            <span className="text-xs text-gray-600">(opcional)</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <WildcardButton
              label="Todo o Nada" description="x2 si acertás · -2 si fallás"
              active={wildcard === "todo_o_nada"}
              onClick={() => setWildcard(wildcard === "todo_o_nada" ? null : "todo_o_nada")}
              color="#ef4444"
            />
            <WildcardButton
              label="Escudo" description="Protege puntos avanzados"
              active={wildcard === "escudo"}
              onClick={() => setWildcard(wildcard === "escudo" ? null : "escudo")}
              color="#3b82f6"
            />
            <WildcardButton
              label="Ladrón" description="Robá 2 pts al líder"
              active={wildcard === "ladron"}
              onClick={() => setWildcard(wildcard === "ladron" ? null : "ladron")}
              color="#a855f7"
            />
          </div>
        </div>
      )}

      {/* Avanzadas */}
      {hasAnyAdvanced && (
        <div className="bg-gradient-to-br from-yellow-500/5 to-orange-500/5 border border-yellow-500/20 rounded-2xl overflow-hidden">
          <button
            onClick={() => setAdvancedExpanded((v) => !v)}
            className="w-full flex items-center gap-2 p-5 hover:bg-white/[0.02] transition-colors text-left"
          >
            <Sparkles size={16} className="text-yellow-400" />
            <div className="flex-1">
              <p className="text-yellow-400 font-bold text-sm">Predicciones avanzadas</p>
              <p className="text-gray-500 text-xs mt-0.5">
                Bonus extra si acertás · solo cuentan los campos que llenes
              </p>
            </div>
            <ChevronDown
              size={18}
              className={cn("text-gray-500 transition-transform", advancedExpanded && "rotate-180")}
            />
          </button>

          {advancedExpanded && (
            <div className="px-5 pb-5 space-y-4 border-t border-white/5">
              {/* Goleador */}
              {adv.firstScorer && (
                <AdvancedRow label="Primer goleador del partido" pts={ADVANCED_POINTS.firstScorer}>
                  <PlayerSelect
                    homeCode={match.home_team_code}
                    awayCode={match.away_team_code}
                    homeName={match.home_team}
                    awayName={match.away_team}
                    value={picks.firstScorer}
                    onChange={(v) => updatePick("firstScorer", v)}
                  />
                </AdvancedRow>
              )}

              {/* Primer equipo en marcar */}
              {adv.firstTeamToScore && (
                <AdvancedRow label="Primer equipo en marcar" pts={ADVANCED_POINTS.firstTeamToScore}>
                  <PickRow
                    options={[
                      { value: "home", label: match.home_team_code },
                      { value: "away", label: match.away_team_code },
                    ]}
                    selected={picks.firstTeamToScore}
                    onChange={(v) => updatePick("firstTeamToScore", v as "home" | "away")}
                  />
                </AdvancedRow>
              )}

              {/* Minuto del primer gol */}
              {adv.goalMinute && (
                <AdvancedRow label="Minuto del primer gol" pts={ADVANCED_POINTS.goalMinute}>
                  <PickRow
                    options={MINUTE_RANGES.map((r) => ({ value: r, label: r + "'" }))}
                    selected={picks.goalMinute}
                    onChange={(v) => updatePick("goalMinute", v)}
                  />
                </AdvancedRow>
              )}

              {/* Resultado al descanso */}
              {adv.halftimeResult && (
                <AdvancedRow label="Resultado al descanso (1er tiempo)" pts={ADVANCED_POINTS.halftimeResult}>
                  <HalftimeInput
                    value={picks.halftimeResult ?? ""}
                    onChange={(v) => updatePick("halftimeResult", v)}
                    homeCode={match.home_team_code}
                    awayCode={match.away_team_code}
                  />
                </AdvancedRow>
              )}

              {/* Total amarillas */}
              {adv.yellowCards && (
                <AdvancedRow label="Total tarjetas amarillas" pts={ADVANCED_POINTS.yellowCards}>
                  <PickRow
                    options={YELLOW_RANGES.map((r) => ({ value: r, label: r }))}
                    selected={picks.totalYellowCards}
                    onChange={(v) => updatePick("totalYellowCards", v)}
                  />
                </AdvancedRow>
              )}

              {/* Tarjeta roja */}
              {adv.redCards && (
                <AdvancedRow
                  label="¿Habrá tarjeta roja?"
                  ptsLabel={`Sí +${ADVANCED_POINTS.redCardYes} · No +${ADVANCED_POINTS.redCardNo}`}
                >
                  <PickRow
                    options={[
                      { value: "yes", label: `Sí (+${ADVANCED_POINTS.redCardYes})` },
                      { value: "no", label: `No (+${ADVANCED_POINTS.redCardNo})` },
                    ]}
                    selected={picks.anyRedCard}
                    onChange={(v) => updatePick("anyRedCard", v as "yes" | "no")}
                  />
                </AdvancedRow>
              )}

              {/* Total córners */}
              {adv.corners && (
                <AdvancedRow label="Total córners" pts={ADVANCED_POINTS.corners}>
                  <PickRow
                    options={CORNER_RANGES.map((r) => ({ value: r, label: r }))}
                    selected={picks.totalCorners}
                    onChange={(v) => updatePick("totalCorners", v)}
                  />
                </AdvancedRow>
              )}

              {/* Posesión */}
              {adv.possession && (
                <AdvancedRow label="Equipo con más posesión" pts={ADVANCED_POINTS.possession}>
                  <PickRow
                    options={[
                      { value: "home", label: match.home_team_code },
                      { value: "away", label: match.away_team_code },
                    ]}
                    selected={picks.morePossession}
                    onChange={(v) => updatePick("morePossession", v as "home" | "away")}
                  />
                </AdvancedRow>
              )}

              {/* Total tiros */}
              {adv.totalShots && (
                <AdvancedRow label="Total de tiros" pts={ADVANCED_POINTS.totalShots}>
                  <PickRow
                    options={SHOT_RANGES.map((r) => ({ value: r, label: r }))}
                    selected={picks.totalShots}
                    onChange={(v) => updatePick("totalShots", v)}
                  />
                </AdvancedRow>
              )}

              {/* Total faltas */}
              {adv.totalFouls && (
                <AdvancedRow label="Total de faltas" pts={ADVANCED_POINTS.totalFouls}>
                  <PickRow
                    options={FOUL_RANGES.map((r) => ({ value: r, label: r }))}
                    selected={picks.totalFouls}
                    onChange={(v) => updatePick("totalFouls", v)}
                  />
                </AdvancedRow>
              )}
            </div>
          )}
        </div>
      )}

      {/* Aplicar a todas las ligas */}
      {leagues.length > 1 && (
        <label className="flex items-center gap-3 bg-white/5 border border-white/10 hover:border-green-500/30 rounded-xl px-4 py-3 cursor-pointer transition-colors">
          <input
            type="checkbox"
            checked={applyAll}
            onChange={(e) => setApplyAll(e.target.checked)}
            className="w-4 h-4 accent-green-500 shrink-0"
          />
          <span className="text-sm text-gray-300">
            Guardar esta predicción en{" "}
            <span className="text-white font-bold">todas mis ligas ({leagues.length})</span>
          </span>
        </label>
      )}

      {/* Guardar */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 disabled:opacity-60 text-black font-black py-4 rounded-xl transition-colors"
      >
        {saving && <Loader2 size={18} className="animate-spin" />}
        {saved && <Check size={18} />}
        {saving
          ? "Guardando..."
          : saved
          ? savedCount > 1
            ? `¡Guardada en ${savedCount} ligas!`
            : "¡Predicción guardada!"
          : existing
          ? "Actualizar predicción"
          : "Guardar predicción"}
      </button>

      {saveError && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-300">
          <Lock size={14} className="shrink-0" />
          {saveError}
        </div>
      )}
    </div>
  )
}

function ScoreInput({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
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

function WildcardButton({ label, description, active, onClick, color }: { label: string; description: string; active: boolean; onClick: () => void; color: string }) {
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

function AdvancedRow({ label, pts, ptsLabel, children }: { label: string; pts?: number; ptsLabel?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-white text-sm font-medium">{label}</p>
        <span className="text-yellow-400 text-xs font-bold">
          {ptsLabel ?? `+${pts} pts`}
        </span>
      </div>
      {children}
    </div>
  )
}

function PickRow({ options, selected, onChange }: { options: { value: string; label: string }[]; selected: string | undefined; onChange: (v: string | undefined) => void }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {options.map((opt) => {
        const active = selected === opt.value
        return (
          <button
            key={opt.value}
            onClick={() => onChange(active ? undefined : opt.value)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
              active
                ? "bg-yellow-500/15 border-yellow-500/40 text-white"
                : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function HalftimeInput({ value, onChange, homeCode, awayCode }: { value: string; onChange: (v: string) => void; homeCode: string; awayCode: string }) {
  const [h, a] = value ? value.split("-").map((n) => parseInt(n) || 0) : [0, 0]
  const set = (newH: number, newA: number) => onChange(`${Math.max(0, newH)}-${Math.max(0, newA)}`)
  return (
    <div className="flex items-center justify-center gap-3">
      <div className="flex items-center gap-1">
        <span className="text-gray-500 text-xs">{homeCode}</span>
        <button onClick={() => set(h - 1, a)} className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
          <Minus size={12} className="text-gray-400" />
        </button>
        <div className="w-9 h-9 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center justify-center">
          <span className="text-lg font-black text-white">{h}</span>
        </div>
        <button onClick={() => set(h + 1, a)} className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
          <Plus size={12} className="text-gray-400" />
        </button>
      </div>
      <span className="text-gray-500">·</span>
      <div className="flex items-center gap-1">
        <button onClick={() => set(h, a - 1)} className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
          <Minus size={12} className="text-gray-400" />
        </button>
        <div className="w-9 h-9 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center justify-center">
          <span className="text-lg font-black text-white">{a}</span>
        </div>
        <button onClick={() => set(h, a + 1)} className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
          <Plus size={12} className="text-gray-400" />
        </button>
        <span className="text-gray-500 text-xs">{awayCode}</span>
      </div>
    </div>
  )
}

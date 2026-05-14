"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import TeamFlag from "@/components/TeamFlag"
import { TEAMS } from "@/lib/teams"
import { Loader2, Check, ChevronDown, Trophy, Medal, Award, Target } from "lucide-react"
import { cn } from "@/lib/utils"

type League = {
  id: string
  name: string
  banner_color: string
}

type BracketData = {
  champion?: string
  runnerUp?: string
  thirdPlace?: string
  fourthPlace?: string
  topScorer?: string
}

type ExistingBracket = {
  league_id: string
  bracket_data: BracketData
  points_earned: number
}

type Props = {
  leagues: League[]
  existingBrackets: ExistingBracket[]
  isLocked: boolean
}

const PICKS: {
  key: keyof BracketData
  label: string
  icon: typeof Trophy
  color: string
  points: number
}[] = [
  { key: "champion", label: "Campeón", icon: Trophy, color: "text-yellow-400", points: 50 },
  { key: "runnerUp", label: "Subcampeón", icon: Medal, color: "text-gray-300", points: 25 },
  { key: "thirdPlace", label: "Tercer puesto", icon: Award, color: "text-orange-400", points: 15 },
  { key: "fourthPlace", label: "Cuarto puesto", icon: Award, color: "text-amber-700", points: 10 },
]

const ALL_TEAMS = Object.values(TEAMS).sort((a, b) => a.name.localeCompare(b.name))

export default function BracketForm({ leagues, existingBrackets, isLocked }: Props) {
  const [selectedLeagueId, setSelectedLeagueId] = useState(leagues[0].id)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const existing = existingBrackets.find((b) => b.league_id === selectedLeagueId)
  const [picks, setPicks] = useState<BracketData>(existing?.bracket_data ?? {})

  function selectTeam(slot: keyof BracketData, teamCode: string) {
    setPicks((p) => ({ ...p, [slot]: teamCode }))
  }

  function handleLeagueChange(leagueId: string) {
    setSelectedLeagueId(leagueId)
    const ex = existingBrackets.find((b) => b.league_id === leagueId)
    setPicks(ex?.bracket_data ?? {})
  }

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from("bracket_predictions").upsert(
      {
        user_id: user.id,
        league_id: selectedLeagueId,
        bracket_data: picks,
      },
      { onConflict: "user_id,league_id" }
    )

    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
    setSaving(false)
  }

  const filledCount = Object.values(picks).filter(Boolean).length

  return (
    <div className="space-y-5">
      {/* Selector de liga */}
      {leagues.length > 1 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            Bracket para la liga:
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {leagues.map((l) => {
              const hasBracket = existingBrackets.some((b) => b.league_id === l.id)
              return (
                <button
                  key={l.id}
                  onClick={() => handleLeagueChange(l.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors border",
                    selectedLeagueId === l.id
                      ? "bg-yellow-500/15 border-yellow-500/40 text-white"
                      : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"
                  )}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: l.banner_color }} />
                  {l.name}
                  {hasBracket && <Check size={12} className="text-yellow-400" />}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Picks */}
      <div className="space-y-3">
        {PICKS.map((pick) => (
          <PickCard
            key={pick.key}
            label={pick.label}
            icon={pick.icon}
            color={pick.color}
            points={pick.points}
            selected={picks[pick.key]}
            otherSelections={Object.entries(picks)
              .filter(([k]) => k !== pick.key)
              .map(([, v]) => v)
              .filter(Boolean) as string[]}
            onSelect={(code) => selectTeam(pick.key, code)}
            disabled={isLocked}
          />
        ))}
      </div>

      {/* Goleador */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Target size={16} className="text-green-400" />
          <div className="flex-1">
            <p className="text-white font-bold text-sm">Goleador del torneo</p>
            <p className="text-gray-500 text-xs">Nombre del jugador que termine como máximo artillero</p>
          </div>
          <span className="text-green-400 font-bold text-sm">+25 pts</span>
        </div>
        <input
          type="text"
          value={picks.topScorer ?? ""}
          onChange={(e) => setPicks((p) => ({ ...p, topScorer: e.target.value }))}
          placeholder="Ej: Lionel Messi"
          disabled={isLocked}
          maxLength={60}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/50 transition-colors disabled:opacity-50"
        />
      </div>

      {/* Progress + Guardar */}
      <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/5 border border-yellow-500/20 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-white font-bold">
            {filledCount}/5 predicciones
          </span>
          <span className="text-xs text-yellow-400">
            {existing && `Guardado · ${existing.points_earned} pts`}
          </span>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all"
            style={{ width: `${(filledCount / 5) * 100}%` }}
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving || isLocked || filledCount === 0}
          className="w-full flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-black py-3.5 rounded-xl transition-colors"
        >
          {saving && <Loader2 size={18} className="animate-spin" />}
          {saved && <Check size={18} />}
          {isLocked
            ? "Bracket cerrado"
            : saving
            ? "Guardando..."
            : saved
            ? "¡Guardado!"
            : existing
            ? "Actualizar bracket"
            : "Guardar mis predicciones"}
        </button>
      </div>
    </div>
  )
}

function PickCard({
  label,
  icon: Icon,
  color,
  points,
  selected,
  otherSelections,
  onSelect,
  disabled,
}: {
  label: string
  icon: typeof Trophy
  color: string
  points: number
  selected?: string
  otherSelections: string[]
  onSelect: (code: string) => void
  disabled: boolean
}) {
  const [open, setOpen] = useState(false)
  const team = selected ? TEAMS[selected] : null
  const otherSet = new Set(otherSelections)

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
      <button
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        className="w-full flex items-center gap-3 p-4 hover:bg-white/[0.02] transition-colors disabled:cursor-not-allowed"
      >
        <Icon size={20} className={color} />
        <div className="flex-1 text-left">
          <p className="text-white font-bold text-sm">{label}</p>
          <p className="text-gray-500 text-xs">+{points} puntos si acertás</p>
        </div>
        {team ? (
          <div className="flex items-center gap-2">
            <TeamFlag code={team.fifaCode} size={28} />
            <span className="text-white text-sm font-medium">{team.name}</span>
          </div>
        ) : (
          <span className="text-gray-600 text-xs">Sin elegir</span>
        )}
        <ChevronDown
          size={18}
          className={cn("text-gray-500 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="border-t border-white/10 p-3 max-h-72 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ALL_TEAMS.map((t) => {
              const isSelected = selected === t.fifaCode
              const isPickedElsewhere = otherSet.has(t.fifaCode)
              return (
                <button
                  key={t.fifaCode}
                  onClick={() => {
                    onSelect(t.fifaCode)
                    setOpen(false)
                  }}
                  disabled={isPickedElsewhere}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors border",
                    isSelected
                      ? "bg-yellow-500/15 border-yellow-500/40 text-white"
                      : isPickedElsewhere
                      ? "bg-white/5 border-white/5 text-gray-700 cursor-not-allowed line-through"
                      : "bg-white/5 border-white/10 text-gray-300 hover:border-white/20 hover:bg-white/10"
                  )}
                >
                  <TeamFlag code={t.fifaCode} size={20} />
                  <span className="truncate flex-1 text-left">{t.name}</span>
                  {t.group && <span className="text-[9px] text-gray-600">{t.group}</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

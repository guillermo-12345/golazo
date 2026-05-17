"use client"

import { useState } from "react"
import Link from "next/link"
import {
  CalendarClock,
  Users,
  BarChart3,
  ListChecks,
  Clock,
  MapPin,
  Trophy,
} from "lucide-react"
import TeamFlag from "@/components/TeamFlag"
import LocalDateTime from "@/components/LocalDateTime"
import type { Match, QualifierMatch } from "@/types/database"

type Stats = {
  played: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
}

type SquadPlayer = { name: string; number: number | null; position: string | null }

type Props = {
  teamCode: string
  teamName: string
  matches: Match[]
  stats: Stats
  players: SquadPlayer[]
  qualifierMatches: QualifierMatch[]
  confederationLabel: string
  qualificationSummary: string
  isHost: boolean
}

// Orden y etiqueta en español de cada línea del plantel.
const POSITION_GROUPS: Array<{ key: string; label: string }> = [
  { key: "Goalkeeper", label: "Arqueros" },
  { key: "Defender", label: "Defensores" },
  { key: "Midfielder", label: "Mediocampistas" },
  { key: "Attacker", label: "Delanteros" },
  { key: "__other__", label: "Otros" },
]

function groupSquad(players: SquadPlayer[]) {
  return POSITION_GROUPS.map((g) => ({
    ...g,
    list:
      g.key === "__other__"
        ? players.filter(
            (p) => !p.position || !POSITION_GROUPS.some((x) => x.key === p.position)
          )
        : players.filter((p) => p.position === g.key),
  })).filter((g) => g.list.length > 0)
}

const TABS = [
  { id: "partidos", label: "Partidos", icon: CalendarClock },
  { id: "alineacion", label: "Alineación", icon: Users },
  { id: "estadisticas", label: "Estadísticas", icon: BarChart3 },
  { id: "preeliminares", label: "Preeliminares", icon: ListChecks },
] as const

type TabId = (typeof TABS)[number]["id"]

export default function CountryTabs({
  teamCode,
  teamName,
  matches,
  stats,
  players,
  qualifierMatches,
  confederationLabel,
  qualificationSummary,
  isHost,
}: Props) {
  const [tab, setTab] = useState<TabId>("partidos")
  const squad = groupSquad(players)

  const played = matches.filter((m) => m.status === "finished")
  const upcoming = matches.filter((m) => m.status !== "finished")

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 bg-white/5 border border-white/10 rounded-2xl p-1 mb-6 overflow-x-auto">
        {TABS.map((t) => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-colors flex-1 justify-center ${
                active
                  ? "bg-green-500/15 text-green-400 border border-green-500/20"
                  : "text-gray-500 hover:text-white"
              }`}
            >
              <t.icon size={15} className="shrink-0" />
              <span>{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* ───── Partidos ───── */}
      {tab === "partidos" && (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <section>
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
                Próximos partidos ({upcoming.length})
              </h2>
              <div className="space-y-2">
                {upcoming.map((m) => (
                  <CountryMatchRow key={m.id} match={m} teamCode={teamCode} />
                ))}
              </div>
            </section>
          )}

          {played.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Trophy size={16} className="text-yellow-400" />
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                  Historial ({played.length})
                </h2>
              </div>
              <div className="space-y-2">
                {played.map((m) => (
                  <CountryMatchRow key={m.id} match={m} teamCode={teamCode} finished />
                ))}
              </div>
            </section>
          )}

          {matches.length === 0 && (
            <EmptyState
              title="Todavía no hay partidos cargados"
              desc={`Los partidos de ${teamName} en el Mundial aparecerán acá apenas se confirme el fixture.`}
            />
          )}
        </div>
      )}

      {/* ───── Alineación ───── */}
      {tab === "alineacion" && (
        <div className="space-y-6">
          {players.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                  Plantel de {teamName}
                </h2>
                <span className="text-xs text-gray-600">{players.length} jugadores</span>
              </div>
              {squad.map((g) => (
                <section key={g.key}>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    {g.label} <span className="text-gray-700">· {g.list.length}</span>
                  </p>
                  <div className="space-y-2">
                    {g.list.map((p) => (
                      <PlayerRow key={`${p.name}-${p.number ?? "x"}`} player={p} />
                    ))}
                  </div>
                </section>
              ))}
              <p className="text-gray-600 text-xs text-center">
                Plantel sincronizado desde API-Football. Puede variar hasta la
                lista definitiva del Mundial 2026.
              </p>
            </>
          ) : (
            <EmptyState
              title="Alineación no disponible todavía"
              desc={`El plantel de ${teamName} se sincroniza desde la fuente oficial (API-Football). Aparecerá acá apenas se cargue.`}
            />
          )}
        </div>
      )}

      {/* ───── Estadísticas ───── */}
      {tab === "estadisticas" && (
        <div>
          {stats.played > 0 ? (
            <>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mb-6">
                <StatCard label="Jugados" value={stats.played} color="text-gray-300" />
                <StatCard label="Ganados" value={stats.wins} color="text-green-400" />
                <StatCard label="Empatados" value={stats.draws} color="text-yellow-400" />
                <StatCard label="Perdidos" value={stats.losses} color="text-red-400" />
                <StatCard
                  label="Goles"
                  value={`${stats.goalsFor}:${stats.goalsAgainst}`}
                  color="text-blue-400"
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard
                  label="Dif. de gol"
                  value={
                    stats.goalsFor - stats.goalsAgainst > 0
                      ? `+${stats.goalsFor - stats.goalsAgainst}`
                      : `${stats.goalsFor - stats.goalsAgainst}`
                  }
                  color="text-white"
                />
                <StatCard
                  label="Goles/partido"
                  value={(stats.goalsFor / stats.played).toFixed(1)}
                  color="text-green-400"
                />
                <StatCard
                  label="% Victorias"
                  value={`${Math.round((stats.wins / stats.played) * 100)}%`}
                  color="text-green-400"
                />
                <StatCard
                  label="Puntos"
                  value={stats.wins * 3 + stats.draws}
                  color="text-yellow-400"
                />
              </div>
            </>
          ) : (
            <EmptyState
              title="Sin estadísticas todavía"
              desc={`Las estadísticas de ${teamName} se calcularán automáticamente a medida que se jueguen los partidos del Mundial.`}
            />
          )}
        </div>
      )}

      {/* ───── Preeliminares ───── */}
      {tab === "preeliminares" && (
        <div className="space-y-6">
          {/* Resumen verificado (confederación / anfitrión) — siempre exacto */}
          <div
            className={`rounded-2xl p-5 border ${
              isHost
                ? "bg-green-500/10 border-green-500/25"
                : "bg-white/5 border-white/10"
            }`}
          >
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-1.5">
              {isHost ? "País anfitrión" : `Confederación · ${confederationLabel}`}
            </p>
            <p className="text-white font-medium leading-snug">{qualificationSummary}</p>
          </div>

          {qualifierMatches.length > 0 ? (
            <section>
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
                Camino al Mundial · {qualifierMatches.length} partidos
              </h2>
              <div className="space-y-2">
                {qualifierMatches.map((m) => (
                  <QualifierMatchRow key={m.id} match={m} teamCode={teamCode} />
                ))}
              </div>
              <p className="text-gray-600 text-xs mt-3 text-center">
                Datos oficiales de API-Football. Solo informativo — las eliminatorias
                no puntúan en la quiniela.
              </p>
            </section>
          ) : (
            <EmptyState
              title="Resultados de eliminatorias todavía no sincronizados"
              desc={`El detalle partido a partido de ${teamName} en las eliminatorias se cargará desde la fuente oficial (API-Football). Mientras tanto, la confederación de arriba es información verificada.`}
            />
          )}
        </div>
      )}
    </div>
  )
}

function CountryMatchRow({
  match,
  teamCode,
  finished,
}: {
  match: Match
  teamCode: string
  finished?: boolean
}) {
  const isHome = match.home_team_code === teamCode
  const myScore = isHome ? match.home_score : match.away_score
  const opponentScore = isHome ? match.away_score : match.home_score
  const opponentCode = isHome ? match.away_team_code : match.home_team_code
  const opponentName = isHome ? match.away_team : match.home_team

  let resultColor = "text-gray-400"
  let resultLabel = ""
  if (finished && myScore !== null && opponentScore !== null) {
    if (myScore > opponentScore) {
      resultColor = "text-green-400"
      resultLabel = "G"
    } else if (myScore < opponentScore) {
      resultColor = "text-red-400"
      resultLabel = "P"
    } else {
      resultColor = "text-yellow-400"
      resultLabel = "E"
    }
  }

  return (
    <Link
      href={`/partidos/${match.id}`}
      className="block bg-white/5 border border-white/10 hover:border-green-500/30 rounded-xl p-3 transition-colors"
    >
      <div className="flex items-center justify-between mb-1.5 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Clock size={11} />
          <LocalDateTime date={match.scheduled_at} formatStr="d MMM · HH:mm" />
        </span>
        <span className="text-[10px] uppercase tracking-wider">
          {match.stage.replace(/_/g, " ")}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 font-bold w-8">{isHome ? "LOC" : "VIS"}</span>
        <TeamFlag code={opponentCode} size={24} />
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">vs {opponentName}</p>
          {match.venue && (
            <p className="text-gray-600 text-xs flex items-center gap-1">
              <MapPin size={10} />
              {match.venue}
            </p>
          )}
        </div>
        {finished && myScore !== null && opponentScore !== null ? (
          <div className="text-right">
            <p className="text-white font-black tabular-nums">
              {myScore}-{opponentScore}
            </p>
            <p className={`text-[10px] font-bold ${resultColor}`}>{resultLabel}</p>
          </div>
        ) : (
          <span className="text-green-400 text-xs font-medium">Predecir →</span>
        )}
      </div>
    </Link>
  )
}

function QualifierMatchRow({
  match,
  teamCode,
}: {
  match: QualifierMatch
  teamCode: string
}) {
  const isHome = match.home_team_code === teamCode
  const myScore = isHome ? match.home_score : match.away_score
  const opponentScore = isHome ? match.away_score : match.home_score
  const opponentCode = isHome ? match.away_team_code : match.home_team_code
  const opponentName = isHome ? match.away_team : match.home_team
  const finished = match.status === "finished"

  let resultColor = "text-gray-400"
  let resultLabel = ""
  if (finished && myScore !== null && opponentScore !== null) {
    if (myScore > opponentScore) {
      resultColor = "text-green-400"
      resultLabel = "G"
    } else if (myScore < opponentScore) {
      resultColor = "text-red-400"
      resultLabel = "P"
    } else {
      resultColor = "text-yellow-400"
      resultLabel = "E"
    }
  }

  return (
    <div className="block bg-white/5 border border-white/10 rounded-xl p-3">
      <div className="flex items-center justify-between mb-1.5 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Clock size={11} />
          <LocalDateTime date={match.scheduled_at} formatStr="d MMM yyyy" />
        </span>
        <span className="text-[10px] uppercase tracking-wider">
          {match.league_round ?? match.confederation}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 font-bold w-8">
          {isHome ? "LOC" : "VIS"}
        </span>
        <TeamFlag code={opponentCode ?? "UNK"} size={24} />
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">vs {opponentName}</p>
        </div>
        {finished && myScore !== null && opponentScore !== null ? (
          <div className="text-right">
            <p className="text-white font-black tabular-nums">
              {myScore}-{opponentScore}
            </p>
            <p className={`text-[10px] font-bold ${resultColor}`}>{resultLabel}</p>
          </div>
        ) : (
          <span className="text-gray-500 text-xs font-medium">
            {match.status === "scheduled" ? "Por jugarse" : "—"}
          </span>
        )}
      </div>
    </div>
  )
}

function PlayerRow({ player }: { player: SquadPlayer }) {
  return (
    <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3">
      <span className="w-8 h-8 shrink-0 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-gray-400 tabular-nums">
        {player.number ?? "–"}
      </span>
      <p className="flex-1 min-w-0 text-white text-sm font-medium truncate">
        {player.name}
      </p>
      {player.position && (
        <span className="shrink-0 text-[10px] uppercase tracking-wider text-gray-600">
          {player.position}
        </span>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string
  value: number | string
  color: string
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
      <p className={`text-xl font-black ${color}`}>{value}</p>
      <p className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-wider">{label}</p>
    </div>
  )
}

function EmptyState({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
      <p className="text-gray-300 font-medium">{title}</p>
      <p className="text-gray-500 text-sm mt-1.5 max-w-md mx-auto">{desc}</p>
    </div>
  )
}

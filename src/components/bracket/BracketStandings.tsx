import Avatar from "@/components/Avatar"
import TeamFlag from "@/components/TeamFlag"
import type { TournamentResults } from "@/lib/tournament-results"
import { Check, Crown, Users } from "lucide-react"

export type BracketPicks = {
  champion?: string
  runnerUp?: string
  thirdPlace?: string
  fourthPlace?: string
  topScorer?: string
}

export type BracketEntry = {
  userId: string
  displayName: string
  username: string | null
  avatarConfig: unknown
  picks: BracketPicks
  points: number
}

export type BracketLeagueStanding = {
  leagueId: string
  leagueName: string
  entries: BracketEntry[]
}

const PODIUM: Array<{ key: keyof BracketPicks; medal: string }> = [
  { key: "champion", medal: "🥇" },
  { key: "runnerUp", medal: "🥈" },
  { key: "thirdPlace", medal: "🥉" },
  { key: "fourthPlace", medal: "4️⃣" },
]

/**
 * Muestra, por liga, qué predijo cada integrante en el Bracket Challenge,
 * resaltando en verde los aciertos contra el resultado real del Mundial.
 */
export default function BracketStandings({
  results,
  standings,
  currentUserId,
}: {
  results: TournamentResults
  standings: BracketLeagueStanding[]
  currentUserId: string
}) {
  if (!results.isOver || standings.length === 0) return null

  return (
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Users size={18} className="text-yellow-400" />
        <h2 className="text-white font-black text-base">Cómo le fue a cada uno</h2>
      </div>

      <div className="space-y-6">
        {standings.map((league) => {
          const topPoints = league.entries[0]?.points ?? 0
          return (
            <div key={league.leagueId}>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2 px-1">
                {league.leagueName}
              </p>
              <div className="space-y-2">
                {league.entries.map((e) => {
                  const isWinner = topPoints > 0 && e.points === topPoints
                  const isMe = e.userId === currentUserId
                  return (
                    <BracketRow
                      key={e.userId}
                      entry={e}
                      results={results}
                      isWinner={isWinner}
                      isMe={isMe}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function BracketRow({
  entry,
  results,
  isWinner,
  isMe,
}: {
  entry: BracketEntry
  results: TournamentResults
  isWinner: boolean
  isMe: boolean
}) {
  const golRight =
    !!entry.picks.topScorer &&
    !!results.topScorer &&
    entry.picks.topScorer.trim().toLowerCase() === results.topScorer.trim().toLowerCase()

  return (
    <div
      className={`rounded-2xl p-3 border ${
        isWinner
          ? "bg-gradient-to-br from-yellow-500/15 to-transparent border-yellow-500/40"
          : "bg-white/5 border-white/10"
      }`}
    >
      {/* Cabecera: avatar, nombre, puntos */}
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className="relative shrink-0">
          <Avatar config={entry.avatarConfig} username={entry.username ?? undefined} size={34} />
          {isWinner && <span className="absolute -top-2 -right-1 text-sm">👑</span>}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-white font-bold text-sm truncate flex items-center gap-1.5">
            {entry.displayName}
            {isMe && <span className="text-yellow-400 text-xs font-bold">(vos)</span>}
            {isWinner && <Crown size={12} className="text-yellow-400 shrink-0" />}
          </p>
        </div>
        <span className="shrink-0 text-yellow-400 font-black text-sm">
          {entry.points}
          <span className="text-gray-500 text-[11px] font-normal"> pts</span>
        </span>
      </div>

      {/* Podio predicho */}
      <div className="grid grid-cols-4 gap-1.5 mb-1.5">
        {PODIUM.map((p) => {
          const pick = entry.picks[p.key]
          const correct = !!pick && pick === (results[p.key] as string | null)
          return (
            <div
              key={p.key}
              className={`relative rounded-lg px-1 py-1.5 text-center ${
                correct
                  ? "bg-green-500/15 ring-1 ring-green-500/40"
                  : "bg-black/25"
              }`}
            >
              {correct && (
                <Check size={11} className="absolute top-1 right-1 text-green-400" strokeWidth={3} />
              )}
              <div className="text-xs mb-0.5">{p.medal}</div>
              <div className="flex items-center justify-center gap-1">
                {pick && <TeamFlag code={pick} size={14} linkToCountry={false} />}
                <span className={`text-[11px] font-bold ${correct ? "text-green-300" : "text-gray-300"}`}>
                  {pick ?? "—"}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Goleador */}
      <div
        className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 ${
          golRight ? "bg-green-500/15 ring-1 ring-green-500/40" : "bg-black/25"
        }`}
      >
        <span className="text-xs">⚽</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 shrink-0">
          Goleador
        </span>
        <span className={`text-xs font-bold truncate ${golRight ? "text-green-300" : "text-gray-300"}`}>
          {entry.picks.topScorer ?? "—"}
        </span>
        {golRight && <Check size={12} className="text-green-400 ml-auto shrink-0" strokeWidth={3} />}
      </div>
    </div>
  )
}

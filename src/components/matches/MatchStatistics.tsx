import TeamFlag from "@/components/TeamFlag"

type StatItem = {
  type: string
  value: string | number | null
}

type TeamStats = {
  team: { name: string }
  statistics: StatItem[]
}

type Props = {
  statistics: TeamStats[]
  homeTeam: string
  homeCode: string
  awayCode: string
}

// Mapeo del nombre tecnico de API-Football al label en español
const STAT_LABELS: Record<string, string> = {
  "Ball Possession": "Posesión",
  "Total Shots": "Tiros totales",
  "Shots on Goal": "Tiros al arco",
  "Shots off Goal": "Tiros fuera",
  "Blocked Shots": "Tiros bloqueados",
  "Shots insidebox": "Tiros dentro del área",
  "Shots outsidebox": "Tiros fuera del área",
  "Corner Kicks": "Córners",
  "Offsides": "Offsides",
  "Fouls": "Faltas",
  "Yellow Cards": "Tarjetas amarillas",
  "Red Cards": "Tarjetas rojas",
  "Goalkeeper Saves": "Atajadas",
  "Total passes": "Pases totales",
  "Passes accurate": "Pases acertados",
  "Passes %": "Precisión pases",
}

// Stats que mostramos (en este orden)
const STATS_TO_SHOW = [
  "Ball Possession",
  "Total Shots",
  "Shots on Goal",
  "Corner Kicks",
  "Fouls",
  "Yellow Cards",
  "Red Cards",
  "Offsides",
  "Goalkeeper Saves",
  "Passes %",
]

export default function MatchStatistics({ statistics, homeTeam, homeCode, awayCode }: Props) {
  if (!statistics || statistics.length === 0) {
    return null
  }

  const homeStats = statistics.find((s) => s.team.name === homeTeam)
  const awayStats = statistics.find((s) => s.team.name !== homeTeam)

  function getValue(stats: TeamStats | undefined, type: string): string | number {
    const stat = stats?.statistics.find((s) => s.type === type)
    if (!stat || stat.value === null) return "0"
    return stat.value
  }

  function getNumericValue(stats: TeamStats | undefined, type: string): number {
    const v = getValue(stats, type)
    if (typeof v === "number") return v
    if (typeof v === "string") {
      const num = parseFloat(v.replace("%", ""))
      return isNaN(num) ? 0 : num
    }
    return 0
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      {/* Header con banderas */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 mb-4 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2 justify-end">
          <span className="text-white text-sm font-bold">{homeCode}</span>
          <TeamFlag code={homeCode} size={20} />
        </div>
        <span className="text-gray-500 text-xs uppercase tracking-wider">vs</span>
        <div className="flex items-center gap-2">
          <TeamFlag code={awayCode} size={20} />
          <span className="text-white text-sm font-bold">{awayCode}</span>
        </div>
      </div>

      <div className="space-y-3">
        {STATS_TO_SHOW.map((statType) => {
          const homeVal = getValue(homeStats, statType)
          const awayVal = getValue(awayStats, statType)
          const homeNum = getNumericValue(homeStats, statType)
          const awayNum = getNumericValue(awayStats, statType)
          const total = homeNum + awayNum
          const homePct = total > 0 ? (homeNum / total) * 100 : 50
          const label = STAT_LABELS[statType] ?? statType

          return (
            <div key={statType}>
              <div className="grid grid-cols-[60px_1fr_60px] items-center gap-3 text-sm mb-1">
                <span className="text-white font-bold text-right tabular-nums">{homeVal}</span>
                <span className="text-gray-500 text-center text-xs">{label}</span>
                <span className="text-white font-bold text-left tabular-nums">{awayVal}</span>
              </div>
              <div className="flex gap-0.5 h-1 rounded-full overflow-hidden bg-white/5">
                <div
                  className="bg-green-500/60 transition-all"
                  style={{ width: `${homePct}%` }}
                />
                <div
                  className="bg-blue-500/60 transition-all"
                  style={{ width: `${100 - homePct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

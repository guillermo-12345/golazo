import { CircleDot, Square, ArrowLeftRight, AlertTriangle } from "lucide-react"
import TeamFlag from "@/components/TeamFlag"

type Event = {
  time: { elapsed: number; extra: number | null }
  team: { name: string }
  player: { name: string } | null
  type: string
  detail: string
}

type Props = {
  events: Event[]
  homeTeam: string
  homeCode: string
  awayCode: string
}

export default function MatchEvents({ events, homeTeam, homeCode, awayCode }: Props) {
  if (!events || events.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
        <p className="text-gray-500 text-sm">No hay eventos registrados para este partido</p>
      </div>
    )
  }

  // Filtrar VAR cancellations y substituciones tipo soso (mantenemos goles y tarjetas como prioridad)
  const importantEvents = events.filter((e) => {
    if (e.type === "Var") return false // VAR cancellations confuso, lo escondemos
    return true
  })

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
      {importantEvents.map((e, idx) => {
        const isHome = e.team.name === homeTeam
        const meta = getEventMeta(e.type, e.detail)
        return (
          <div
            key={idx}
            className={`flex items-center gap-3 px-4 py-2.5 border-b border-white/5 last:border-b-0 ${
              isHome ? "" : "flex-row-reverse"
            }`}
          >
            <div className="w-12 text-center">
              <span className="text-white font-bold text-sm tabular-nums">
                {e.time.elapsed}&apos;
                {e.time.extra && <span className="text-gray-500">+{e.time.extra}</span>}
              </span>
            </div>
            <TeamFlag code={isHome ? homeCode : awayCode} size={20} />
            <div className={`flex-1 ${isHome ? "" : "text-right"}`}>
              <div className="flex items-center gap-2 text-sm">
                {isHome && meta.icon}
                <p className="text-white font-medium">
                  {e.player?.name ?? "—"}
                </p>
                {!isHome && meta.icon}
              </div>
              <p className="text-gray-500 text-xs">{meta.label}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function getEventMeta(type: string, detail: string) {
  if (type === "Goal") {
    let icon = <CircleDot size={14} className="text-green-400" />
    let label = "Gol"
    if (detail.includes("Penalty")) {
      label = "Gol de penal"
    } else if (detail.includes("Own Goal")) {
      label = "Gol en contra"
      icon = <CircleDot size={14} className="text-red-400" />
    } else if (detail.includes("Free Kick")) {
      label = "Gol de tiro libre"
    }
    return { icon, label }
  }
  if (type === "Card") {
    if (detail === "Yellow Card") {
      return {
        icon: <Square size={12} className="text-yellow-400" fill="currentColor" />,
        label: "Tarjeta amarilla",
      }
    }
    if (detail === "Red Card") {
      return {
        icon: <Square size={12} className="text-red-500" fill="currentColor" />,
        label: "Tarjeta roja",
      }
    }
    return { icon: <Square size={12} className="text-gray-400" />, label: detail }
  }
  if (type === "subst") {
    return {
      icon: <ArrowLeftRight size={12} className="text-blue-400" />,
      label: "Cambio",
    }
  }
  return {
    icon: <AlertTriangle size={12} className="text-gray-500" />,
    label: detail,
  }
}

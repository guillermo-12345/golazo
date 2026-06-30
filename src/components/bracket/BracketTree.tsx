import Link from "next/link"
import TeamFlag from "@/components/TeamFlag"

export type SlotView = { name: string; code: string; known: boolean; provisional: boolean }
export type MatchView = {
  id: string
  home: SlotView
  away: SlotView
  homeScore: number | null
  awayScore: number | null
  status: string
  homeWon: boolean
  awayWon: boolean
  /** Penales (si se definió por penales) */
  homeShootout?: number | null
  awayShootout?: number | null
  /** "penalties" | "et" | undefined */
  outcomeType?: string | null
}
export type RoundView = { stage: string; label: string; color: string; matches: MatchView[] }

/**
 * Cuadro de eliminatorias en árbol (columnas por ronda + líneas conectoras),
 * desplazable horizontalmente. Estilos en globals.css (.bk-*).
 */
export default function BracketTree({ rounds }: { rounds: RoundView[] }) {
  return (
    <div className="bk-scroll">
      <div className="bk">
        {rounds.map((r) => (
          <div className="bk-round" key={r.stage}>
            <div className={`bk-round-title ${r.color}`}>{r.label}</div>
            <div className="bk-body">
              {r.matches.map((m) => (
                <div className="bk-cell" key={m.id}>
                  <Link
                    href={`/partidos/${m.id}`}
                    className={`block w-full rounded-lg border overflow-hidden transition-colors ${
                      m.status === "live"
                        ? "border-red-500/40 bg-red-500/[0.04]"
                        : "border-white/10 bg-white/5 hover:border-green-500/30"
                    }`}
                  >
                    <SlotRow slot={m.home} score={m.homeScore} pens={m.homeShootout} status={m.status} winner={m.homeWon} />
                    <div className="h-px bg-white/8" />
                    <SlotRow slot={m.away} score={m.awayScore} pens={m.awayShootout} status={m.status} winner={m.awayWon} />
                    {m.outcomeType && (
                      <div className="px-2 pb-1 -mt-0.5">
                        <span className="text-[8px] uppercase tracking-wider text-amber-400/80">
                          {m.outcomeType === "penalties" ? "Penales" : "Alargue"}
                        </span>
                      </div>
                    )}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SlotRow({
  slot,
  score,
  pens,
  status,
  winner,
}: {
  slot: SlotView
  score: number | null
  pens?: number | null
  status: string
  winner: boolean
}) {
  const finished = status === "finished"
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1.5 ${winner ? "bg-green-500/10" : ""}`}>
      {slot.known ? (
        <TeamFlag
          code={slot.code}
          size={16}
          linkToCountry={false}
          className={slot.provisional ? "opacity-60" : ""}
        />
      ) : (
        <span className="w-4 h-3 rounded-sm bg-white/10 border border-white/10 shrink-0" />
      )}
      <span
        className={`flex-1 min-w-0 truncate text-xs ${
          !slot.known
            ? "text-gray-500 italic"
            : winner
            ? "text-white font-bold"
            : "text-gray-200"
        }`}
      >
        {slot.known ? slot.code : slot.name}
      </span>
      {slot.provisional && (
        <span className="shrink-0 text-[8px] uppercase tracking-wider text-amber-400/80">prov</span>
      )}
      {(finished || status === "live") && (
        <span className="shrink-0 flex items-baseline gap-0.5">
          <span className={`text-xs font-black tabular-nums ${winner ? "text-green-400" : "text-gray-400"}`}>
            {score ?? 0}
          </span>
          {pens != null && (
            <span className={`text-[9px] font-bold tabular-nums ${winner ? "text-green-400/80" : "text-gray-500"}`}>
              ({pens})
            </span>
          )}
        </span>
      )}
    </div>
  )
}

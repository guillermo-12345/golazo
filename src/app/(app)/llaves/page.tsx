import { createClient } from "@/lib/supabase/server"
import type { Match } from "@/types/database"
import { getTeamByCode } from "@/lib/teams"
import {
  projectBracket,
  P_TO_FIXTURE,
  type BracketMatch,
  type SlotProjection,
} from "@/lib/bracket-resolve"
import BracketTree, { type MatchView, type RoundView, type SlotView } from "@/components/bracket/BracketTree"
import TeamFlag from "@/components/TeamFlag"
import { Swords, MoveHorizontal } from "lucide-react"
import Link from "next/link"

const ROUND_META: Record<string, { label: string; color: string }> = {
  round_of_32: { label: "16avos", color: "text-blue-400" },
  round_of_16: { label: "Octavos", color: "text-cyan-400" },
  quarter_final: { label: "Cuartos", color: "text-purple-400" },
  semi_final: { label: "Semis", color: "text-pink-400" },
  final: { label: "Final", color: "text-yellow-400" },
}
const TREE_ORDER = ["round_of_32", "round_of_16", "quarter_final", "semi_final", "final"]

function slotView(label: string, code: string, proj: SlotProjection | null): SlotView {
  if (getTeamByCode(code)) return { name: label, code, known: true, provisional: false }
  if (proj) return { name: proj.name, code: proj.code, known: true, provisional: proj.provisional }
  return { name: label, code, known: false, provisional: false }
}

export default async function LlavesPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("matches")
    .select("*")
    .order("scheduled_at", { ascending: true })

  const all = (data ?? []) as Match[]
  const projection = projectBracket(all as unknown as BracketMatch[])
  const knockout = all.filter((m) => m.stage !== "group_stage")
  const byStage = (s: string) =>
    knockout.filter((m) => m.stage === s).sort((a, b) => a.api_fixture_id - b.api_fixture_id)

  function toView(m: Match): MatchView {
    const p = projection.get(m.api_fixture_id)
    const finished = m.status === "finished"
    const hs = m.home_score
    const as = m.away_score
    return {
      id: m.id,
      home: slotView(m.home_team, m.home_team_code, p?.home ?? null),
      away: slotView(m.away_team, m.away_team_code, p?.away ?? null),
      homeScore: hs,
      awayScore: as,
      status: m.status,
      homeWon: finished && hs !== null && as !== null && hs > as,
      awayWon: finished && hs !== null && as !== null && as > hs,
    }
  }

  // Orden de los 16avos según el árbol (que cada par alimente su octavo)
  const r16 = byStage("round_of_16")
  const r32 = byStage("round_of_32")
  const r32ById = new Map(r32.map((m) => [m.api_fixture_id, m]))
  const r32Ordered: Match[] = []
  for (const m of r16) {
    const refs = (m.extra_data as { bracket?: { h: string; a: string } } | null)?.bracket
    for (const ref of [refs?.h, refs?.a]) {
      if (!ref) continue
      const fid = P_TO_FIXTURE[parseInt(ref.replace(/\D/g, ""), 10)]
      const mm = r32ById.get(fid)
      if (mm && !r32Ordered.includes(mm)) r32Ordered.push(mm)
    }
  }
  for (const m of r32) if (!r32Ordered.includes(m)) r32Ordered.push(m)

  const rounds: RoundView[] = TREE_ORDER.map((stage) => {
    const meta = ROUND_META[stage]
    const list = stage === "round_of_32" ? r32Ordered : byStage(stage)
    return { stage, label: meta.label, color: meta.color, matches: list.map(toView) }
  }).filter((r) => r.matches.length > 0)

  const thirdPlace = byStage("third_place").map(toView)[0] ?? null
  const hasAny = knockout.length > 0

  return (
    <main className="max-w-5xl mx-auto px-4 md:px-8 py-8">
      <header className="mb-5">
        <div className="flex items-center gap-3 mb-2">
          <Swords size={28} className="text-yellow-400" />
          <h1 className="text-2xl md:text-3xl font-black text-white">Llaves de eliminatorias</h1>
        </div>
        <p className="text-gray-500 text-sm flex items-center gap-1.5 flex-wrap">
          Se arma en vivo según van los grupos. Los equipos en{" "}
          <span className="text-amber-400/90">provisional</span> aún pueden cambiar.
          <span className="inline-flex items-center gap-1 text-gray-600">
            <MoveHorizontal size={13} /> deslizá para ver todo el cuadro
          </span>
        </p>
      </header>

      {!hasAny ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
          <Swords size={40} className="text-gray-600 mx-auto mb-4" />
          <p className="text-gray-300 font-medium">Las llaves aún no están cargadas</p>
        </div>
      ) : (
        <>
          <BracketTree rounds={rounds} />

          {/* Tercer puesto — fuera del árbol principal */}
          {thirdPlace && (
            <section className="mt-6 max-w-xs">
              <h2 className="text-[10px] font-bold uppercase tracking-wider text-orange-400 mb-2">
                Tercer puesto
              </h2>
              <Link
                href={`/partidos/${thirdPlace.id}`}
                className="block rounded-lg border border-white/10 bg-white/5 hover:border-orange-500/30 overflow-hidden transition-colors"
              >
                <ThirdRow slot={thirdPlace.home} score={thirdPlace.homeScore} won={thirdPlace.homeWon} status={thirdPlace.status} />
                <div className="h-px bg-white/8" />
                <ThirdRow slot={thirdPlace.away} score={thirdPlace.awayScore} won={thirdPlace.awayWon} status={thirdPlace.status} />
              </Link>
            </section>
          )}
        </>
      )}
    </main>
  )
}

function ThirdRow({
  slot,
  score,
  won,
  status,
}: {
  slot: SlotView
  score: number | null
  won: boolean
  status: string
}) {
  const show = status === "finished" || status === "live"
  return (
    <div className={`flex items-center gap-2 px-3 py-2 ${won ? "bg-green-500/10" : ""}`}>
      {slot.known ? (
        <TeamFlag code={slot.code} size={18} linkToCountry={false} />
      ) : (
        <span className="w-[18px] h-3 rounded-sm bg-white/10 border border-white/10 shrink-0" />
      )}
      <span className={`flex-1 min-w-0 truncate text-sm ${slot.known ? "text-gray-200" : "text-gray-500 italic"}`}>
        {slot.known ? slot.name : slot.name}
      </span>
      {show && (
        <span className={`text-sm font-black tabular-nums ${won ? "text-green-400" : "text-gray-400"}`}>
          {score ?? 0}
        </span>
      )}
    </div>
  )
}

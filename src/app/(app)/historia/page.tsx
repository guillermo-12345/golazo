import { createClient } from "@/lib/supabase/server"
import { Trophy, Target, Flame, TrendingUp, TrendingDown, Award, Calendar, ChartBar } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import TeamFlag from "@/components/TeamFlag"

type PredWithMatch = {
  id: string
  home_score_pred: number
  away_score_pred: number
  points_earned: number | null
  league_id: string
  match_id: string
  created_at: string
  matches: {
    id: string
    home_team: string
    away_team: string
    home_team_code: string
    away_team_code: string
    home_score: number | null
    away_score: number | null
    status: string
    scheduled_at: string
    stage: string
  } | null
}

export default async function HistoriaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: predsData } = await supabase
    .from("predictions")
    .select(`
      id, home_score_pred, away_score_pred, points_earned,
      league_id, match_id, created_at,
      matches (id, home_team, away_team, home_team_code, away_team_code,
               home_score, away_score, status, scheduled_at, stage)
    `)
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })

  const preds = (predsData ?? []) as unknown as PredWithMatch[]
  const finishedPreds = preds.filter((p) => p.matches?.status === "finished")
  const pendingPreds = preds.filter((p) => p.matches?.status !== "finished")

  // Stats agregadas
  const totalPoints = finishedPreds.reduce((sum, p) => sum + (p.points_earned ?? 0), 0)
  const totalPredictions = preds.length
  const totalFinished = finishedPreds.length
  const exactHits = finishedPreds.filter(
    (p) =>
      p.matches &&
      p.matches.home_score === p.home_score_pred &&
      p.matches.away_score === p.away_score_pred
  ).length
  const winnerHits = finishedPreds.filter((p) => {
    if (!p.matches || p.matches.home_score === null || p.matches.away_score === null) return false
    const realWinner =
      p.matches.home_score > p.matches.away_score
        ? "home"
        : p.matches.home_score < p.matches.away_score
        ? "away"
        : "draw"
    const predWinner =
      p.home_score_pred > p.away_score_pred
        ? "home"
        : p.home_score_pred < p.away_score_pred
        ? "away"
        : "draw"
    return realWinner === predWinner
  }).length
  const misses = totalFinished - winnerHits
  const effectiveness = totalFinished > 0 ? Math.round((winnerHits / totalFinished) * 100) : 0

  // Mejor predicción
  const bestPrediction =
    finishedPreds.length > 0
      ? finishedPreds.reduce((best, p) =>
          (p.points_earned ?? 0) > (best.points_earned ?? 0) ? p : best
        )
      : null

  // Peor predicción (la que más se alejó del resultado real)
  const worstPrediction =
    finishedPreds.length > 0
      ? finishedPreds.reduce((worst, p) => {
          if (!p.matches || p.matches.home_score === null || p.matches.away_score === null)
            return worst
          if (!worst.matches || worst.matches.home_score === null || worst.matches.away_score === null)
            return p
          const diff = (m: PredWithMatch) =>
            Math.abs((m.matches!.home_score ?? 0) - m.home_score_pred) +
            Math.abs((m.matches!.away_score ?? 0) - m.away_score_pred)
          return diff(p) > diff(worst) ? p : worst
        })
      : null

  // Distribución de puntos por etapa
  const byStage = new Map<string, { hits: number; total: number; points: number }>()
  for (const p of finishedPreds) {
    if (!p.matches) continue
    const s = byStage.get(p.matches.stage) ?? { hits: 0, total: 0, points: 0 }
    s.total += 1
    s.points += p.points_earned ?? 0
    if ((p.points_earned ?? 0) > 0) s.hits += 1
    byStage.set(p.matches.stage, s)
  }

  const STAGE_LABEL: Record<string, string> = {
    group_stage: "Fase de grupos",
    round_of_32: "16avos",
    round_of_16: "Octavos",
    quarter_final: "Cuartos",
    semi_final: "Semis",
    third_place: "3er puesto",
    final: "Final",
  }

  return (
    <main className="max-w-3xl mx-auto px-4 md:px-8 py-8">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Calendar size={28} className="text-purple-400" />
          <h1 className="text-2xl md:text-3xl font-black text-white">Mi historia</h1>
        </div>
        <p className="text-gray-500 text-sm">Todo tu recorrido en el Mundial 2026</p>
      </header>

      {totalFinished === 0 && totalPredictions === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
          <Target size={32} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-300 font-medium">Aún no hiciste ninguna predicción</p>
          <p className="text-gray-500 text-sm mt-2">
            Cuando empieces a predecir partidos, tu historia se construye acá automáticamente
          </p>
          <Link
            href="/partidos"
            className="inline-block mt-4 text-green-400 hover:text-green-300 text-sm font-medium"
          >
            Ver partidos →
          </Link>
        </div>
      ) : (
        <>
          {/* Hero con puntos totales */}
          <div className="bg-gradient-to-br from-purple-500/15 to-pink-500/5 border border-purple-500/30 rounded-3xl p-6 mb-6 text-center">
            <p className="text-purple-400 text-xs font-bold uppercase tracking-wider mb-2">
              Puntos ganados en el Mundial
            </p>
            <p className="text-6xl font-black text-white">{totalPoints}</p>
            <p className="text-gray-400 text-sm mt-2">
              de {totalFinished} partidos jugados ·{" "}
              {totalFinished > 0 ? Math.round(totalPoints / totalFinished) : 0} pts promedio
            </p>
          </div>

          {/* Grid de stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <StatBox icon={Target} label="Predicciones" value={totalPredictions} color="text-blue-400" />
            <StatBox
              icon={Award}
              label="Resultados exactos"
              value={exactHits}
              color="text-green-400"
            />
            <StatBox
              icon={TrendingUp}
              label="Aciertos"
              value={`${effectiveness}%`}
              color="text-yellow-400"
              subtitle={`${winnerHits} de ${totalFinished}`}
            />
            <StatBox icon={TrendingDown} label="Fallos" value={misses} color="text-red-400" />
          </div>

          {/* Mejor y peor */}
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            {bestPrediction && bestPrediction.matches && (
              <PredictionHighlight
                title="Mejor predicción"
                titleColor="text-green-400"
                icon={Flame}
                pred={bestPrediction}
              />
            )}
            {worstPrediction && worstPrediction.matches && totalFinished > 1 && (
              <PredictionHighlight
                title="Peor predicción"
                titleColor="text-red-400"
                icon={TrendingDown}
                pred={worstPrediction}
              />
            )}
          </div>

          {/* Distribución por etapa */}
          {byStage.size > 0 && (
            <section className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <ChartBar size={18} className="text-blue-400" />
                <h2 className="text-lg font-bold text-white">Rendimiento por etapa</h2>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                {Array.from(byStage.entries()).map(([stage, data]) => {
                  const pct = data.total > 0 ? Math.round((data.hits / data.total) * 100) : 0
                  return (
                    <div
                      key={stage}
                      className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-4 py-3 border-b border-white/5 last:border-b-0"
                    >
                      <div>
                        <p className="text-white text-sm font-medium">
                          {STAGE_LABEL[stage] ?? stage}
                        </p>
                        <div className="h-1.5 bg-white/5 rounded-full mt-1 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right text-xs">
                        <p className="text-white font-bold">
                          {data.hits}/{data.total}
                        </p>
                        <p className="text-gray-500">{pct}% aciertos</p>
                      </div>
                      <div className="text-right">
                        <p className="text-yellow-400 font-black tabular-nums">{data.points}</p>
                        <p className="text-gray-600 text-[10px]">pts</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Predicciones pendientes */}
          {pendingPreds.length > 0 && (
            <section className="mb-8">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
                Predicciones pendientes ({pendingPreds.length})
              </h2>
              <div className="space-y-2">
                {pendingPreds.slice(0, 5).map((p) => (
                  <PredRow key={p.id} pred={p} />
                ))}
              </div>
            </section>
          )}

          {/* Últimos resultados */}
          {finishedPreds.length > 0 && (
            <section>
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
                Historial reciente
              </h2>
              <div className="space-y-2">
                {finishedPreds.slice(0, 10).map((p) => (
                  <PredRow key={p.id} pred={p} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  )
}

function StatBox({
  icon: Icon,
  label,
  value,
  color,
  subtitle,
}: {
  icon: typeof Trophy
  label: string
  value: number | string
  color: string
  subtitle?: string
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
      <Icon size={18} className={`${color} mx-auto mb-2`} />
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
      {subtitle && <p className="text-[10px] text-gray-600 mt-0.5">{subtitle}</p>}
    </div>
  )
}

function PredictionHighlight({
  title,
  titleColor,
  icon: Icon,
  pred,
}: {
  title: string
  titleColor: string
  icon: typeof Flame
  pred: PredWithMatch
}) {
  const m = pred.matches!
  return (
    <Link
      href={`/partidos/${m.id}`}
      className="bg-white/5 border border-white/10 hover:border-white/20 rounded-2xl p-4 block transition-colors"
    >
      <div className="flex items-center gap-2 mb-3">
        <Icon size={14} className={titleColor} />
        <p className={`${titleColor} text-xs font-bold uppercase tracking-wider`}>{title}</p>
        <span className="ml-auto text-yellow-400 font-black text-lg tabular-nums">
          {(pred.points_earned ?? 0) > 0 ? `+${pred.points_earned}` : pred.points_earned}
        </span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <TeamFlag code={m.home_team_code} size={20} />
        <span className="text-white truncate">{m.home_team}</span>
        <span className="text-gray-500 mx-1">vs</span>
        <TeamFlag code={m.away_team_code} size={20} />
        <span className="text-white truncate">{m.away_team}</span>
      </div>
      <div className="mt-2 flex items-center gap-3 text-xs">
        <span className="text-gray-500">
          Predijiste{" "}
          <span className="text-white font-bold">
            {pred.home_score_pred}-{pred.away_score_pred}
          </span>
        </span>
        <span className="text-gray-600">·</span>
        <span className="text-gray-500">
          Resultado real:{" "}
          <span className="text-white font-bold">
            {m.home_score}-{m.away_score}
          </span>
        </span>
      </div>
    </Link>
  )
}

function PredRow({ pred }: { pred: PredWithMatch }) {
  const m = pred.matches
  if (!m) return null
  const isFinished = m.status === "finished"
  const isLive = m.status === "live"
  const hit = isFinished && (pred.points_earned ?? 0) > 0

  return (
    <Link
      href={`/partidos/${m.id}`}
      className={`flex items-center gap-3 bg-white/5 border rounded-xl p-3 transition-colors ${
        hit
          ? "border-green-500/30"
          : isFinished
          ? "border-white/10"
          : isLive
          ? "border-red-500/30"
          : "border-white/10 hover:border-green-500/20"
      }`}
    >
      <span className="text-xs text-gray-600 w-16 truncate">
        {format(new Date(m.scheduled_at), "d MMM", { locale: es })}
      </span>

      <div className="flex items-center gap-2 flex-1 min-w-0 text-sm">
        <TeamFlag code={m.home_team_code} size={18} />
        <span className="text-white truncate text-xs">{m.home_team_code}</span>
        <span className="text-gray-500 text-xs">vs</span>
        <TeamFlag code={m.away_team_code} size={18} />
        <span className="text-white truncate text-xs">{m.away_team_code}</span>
      </div>

      <div className="text-right">
        <p className="text-white font-mono text-xs">
          {pred.home_score_pred}-{pred.away_score_pred}
          {isFinished && (
            <span className="text-gray-500 ml-1">
              / {m.home_score}-{m.away_score}
            </span>
          )}
        </p>
        {isFinished && (
          <p
            className={`text-[10px] font-bold ${
              (pred.points_earned ?? 0) > 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            {(pred.points_earned ?? 0) >= 0 ? "+" : ""}
            {pred.points_earned ?? 0} pts
          </p>
        )}
      </div>
    </Link>
  )
}

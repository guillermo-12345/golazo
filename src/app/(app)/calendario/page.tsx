import { createClient } from "@/lib/supabase/server"
import type { Match } from "@/types/database"
import TeamFlag from "@/components/TeamFlag"
import LocalDateTime from "@/components/LocalDateTime"
import LiveBadge from "@/components/matches/LiveBadge"
import { CalendarDays, MapPin } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"

const STAGE_LABEL: Record<string, string> = {
  group_stage: "Fase de grupos",
  round_of_32: "16avos de final",
  round_of_16: "Octavos de final",
  quarter_final: "Cuartos de final",
  semi_final: "Semifinales",
  third_place: "Tercer puesto",
  final: "Final",
}

const STAGE_COLOR: Record<string, string> = {
  group_stage: "text-gray-400",
  round_of_32: "text-blue-400",
  round_of_16: "text-cyan-400",
  quarter_final: "text-purple-400",
  semi_final: "text-pink-400",
  third_place: "text-orange-400",
  final: "text-yellow-400",
}

export default async function CalendarioPage() {
  const supabase = await createClient()
  const { data: matchesData } = await supabase
    .from("matches")
    .select("*")
    .order("scheduled_at", { ascending: true })

  const matches = (matchesData ?? []) as Match[]

  // Agrupar por día (clave UTC; el LocalDateTime se encarga de mostrarlo en TZ local)
  const grouped = matches.reduce<Record<string, Match[]>>((acc, m) => {
    const day = format(new Date(m.scheduled_at), "yyyy-MM-dd")
    if (!acc[day]) acc[day] = []
    acc[day].push(m)
    return acc
  }, {})

  return (
    <main className="max-w-4xl mx-auto px-4 md:px-8 py-8">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <CalendarDays size={28} className="text-green-400" />
          <h1 className="text-2xl md:text-3xl font-black text-white">Calendario del Mundial</h1>
        </div>
        <p className="text-gray-500 text-sm">
          Del 11 de junio al 19 de julio de 2026 · {matches.length} partidos
          <span className="block text-gray-600 text-xs mt-1">
            Los horarios se muestran en tu zona horaria local
          </span>
        </p>
      </header>

      {matches.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
          <CalendarDays size={40} className="text-gray-600 mx-auto mb-4" />
          <p className="text-gray-300 font-medium">No hay partidos cargados todavía</p>
          <p className="text-gray-500 text-sm mt-2">
            Corré el seed SQL en Supabase para cargar el calendario
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([day, dayMatches]) => {
            const date = new Date(day + "T12:00:00Z")
            return (
              <section key={day}>
                <div className="sticky top-14 md:top-0 bg-black/70 backdrop-blur-md z-10 -mx-4 px-4 py-2 mb-3">
                  <h2 className="text-white font-bold text-sm flex items-center gap-2">
                    <span className="capitalize">
                      {format(date, "EEEE", { locale: es })}
                    </span>
                    <span className="text-gray-500 font-normal">
                      {format(date, "d 'de' MMMM", { locale: es })}
                    </span>
                    <span className="ml-auto text-xs text-gray-600">
                      {dayMatches.length} {dayMatches.length === 1 ? "partido" : "partidos"}
                    </span>
                  </h2>
                </div>

                <div className="space-y-2">
                  {dayMatches.map((m) => (
                    <Link
                      key={m.id}
                      href={`/partidos/${m.id}`}
                      className={`block bg-white/5 border rounded-2xl p-4 transition-colors ${
                        m.status === "live"
                          ? "border-red-500/40 hover:border-red-500/60 bg-red-500/[0.03]"
                          : "border-white/10 hover:border-green-500/30"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2 text-xs">
                        <span className={`font-bold uppercase tracking-wider ${STAGE_COLOR[m.stage] ?? "text-gray-400"}`}>
                          {STAGE_LABEL[m.stage] ?? m.stage}
                          {m.group_name && ` · Grupo ${m.group_name}`}
                        </span>
                        <LocalDateTime
                          date={m.scheduled_at}
                          formatStr="HH:mm"
                          showTz
                          className="text-gray-400 font-mono"
                        />
                      </div>

                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                        <div className="flex items-center gap-2 justify-end min-w-0">
                          <div className="text-right min-w-0">
                            <p className="text-white font-bold text-sm truncate">{m.home_team}</p>
                            <p className="text-gray-600 text-[10px]">{m.home_team_code}</p>
                          </div>
                          <TeamFlag code={m.home_team_code} size={32} />
                        </div>
                        <div className="text-center min-w-[60px]">
                          {m.status === "finished" ? (
                            <span className="text-white font-black text-lg">
                              {m.home_score ?? 0}-{m.away_score ?? 0}
                            </span>
                          ) : m.status === "live" ? (
                            <div className="flex flex-col items-center">
                              <span className="text-white font-black text-lg">
                                {m.home_score ?? 0}-{m.away_score ?? 0}
                              </span>
                              <LiveBadge minute={m.minute} />
                            </div>
                          ) : (
                            <span className="text-gray-500 text-sm">vs</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                          <TeamFlag code={m.away_team_code} size={32} />
                          <div className="text-left min-w-0">
                            <p className="text-white font-bold text-sm truncate">{m.away_team}</p>
                            <p className="text-gray-600 text-[10px]">{m.away_team_code}</p>
                          </div>
                        </div>
                      </div>

                      {m.venue && (
                        <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-600">
                          <MapPin size={10} />
                          <span className="truncate">{m.venue}</span>
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </main>
  )
}

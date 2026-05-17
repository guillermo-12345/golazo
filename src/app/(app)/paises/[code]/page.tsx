import { createClient } from "@/lib/supabase/server"
import {
  getTeamByCode,
  getFlagUrl,
  getQualificationSummary,
  CONFEDERATION_LABELS,
} from "@/lib/teams"
import type { Match, QualifierMatch, Player } from "@/types/database"
import Link from "next/link"
import TeamFlag from "@/components/TeamFlag"
import CountryTabs from "@/components/paises/CountryTabs"
import { ArrowLeft } from "lucide-react"
import { notFound } from "next/navigation"

export default async function PaisDetailPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const team = getTeamByCode(code)
  if (!team) notFound()

  const supabase = await createClient()

  const [matchesRes, qualifiersRes, playersRes] = await Promise.all([
    supabase
      .from("matches")
      .select("*")
      .or(`home_team_code.eq.${team.fifaCode},away_team_code.eq.${team.fifaCode}`)
      .order("scheduled_at", { ascending: true }),
    supabase
      .from("qualifier_matches")
      .select("*")
      .or(`home_team_code.eq.${team.fifaCode},away_team_code.eq.${team.fifaCode}`)
      .order("scheduled_at", { ascending: true }),
    supabase
      .from("players")
      .select("name, number, position")
      .eq("team_code", team.fifaCode)
      .order("number", { ascending: true, nullsFirst: false }),
  ])

  const matches = (matchesRes.data ?? []) as Match[]
  const qualifierMatches = (qualifiersRes.data ?? []) as QualifierMatch[]
  const players = (playersRes.data ?? []) as Pick<Player, "name" | "number" | "position">[]
  const played = matches.filter((m) => m.status === "finished")

  let wins = 0
  let draws = 0
  let losses = 0
  let goalsFor = 0
  let goalsAgainst = 0
  for (const m of played) {
    if (m.home_score === null || m.away_score === null) continue
    const isHome = m.home_team_code === team.fifaCode
    const myScore = isHome ? m.home_score : m.away_score
    const opponentScore = isHome ? m.away_score : m.home_score
    goalsFor += myScore
    goalsAgainst += opponentScore
    if (myScore > opponentScore) wins++
    else if (myScore < opponentScore) losses++
    else draws++
  }

  const stats = {
    played: played.length,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
  }

  return (
    <main className="max-w-3xl mx-auto px-4 md:px-8 py-8">
      <Link
        href="/paises"
        className="inline-flex items-center gap-2 text-gray-500 hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Países
      </Link>

      {/* Hero del país */}
      <div className="relative bg-gradient-to-br from-white/10 to-white/5 border border-white/15 rounded-3xl p-8 mb-6 overflow-hidden">
        <div
          className="absolute inset-0 opacity-10 blur-2xl"
          style={{
            backgroundImage: `url(${getFlagUrl(team.fifaCode, 320)})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
          <TeamFlag code={team.fifaCode} size={120} className="shadow-2xl" />
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-black text-white">{team.name}</h1>
            <p className="text-gray-400 mt-1 text-sm">
              {team.fifaCode}
              {team.group && (
                <>
                  {" · "}
                  <Link
                    href={`/grupos/${team.group}`}
                    className="hover:text-green-400 transition-colors"
                  >
                    Grupo {team.group}
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      <CountryTabs
        teamCode={team.fifaCode}
        teamName={team.name}
        matches={matches}
        stats={stats}
        players={players}
        qualifierMatches={qualifierMatches}
        confederationLabel={CONFEDERATION_LABELS[team.confederation]}
        qualificationSummary={getQualificationSummary(team.fifaCode) ?? ""}
        isHost={!!team.host}
      />
    </main>
  )
}

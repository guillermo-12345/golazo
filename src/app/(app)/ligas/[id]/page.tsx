import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Users, Trophy, Globe, Lock, Settings, Activity as ActivityIcon } from "lucide-react"
import InviteCodeBox from "@/components/leagues/InviteCodeBox"
import JoinLeagueButton from "@/components/leagues/JoinLeagueButton"
import LeagueIcon from "@/components/LeagueIcon"
import ActivityFeed from "@/components/leagues/ActivityFeed"
import LeaderboardTable from "@/components/leagues/LeaderboardTable"
import ShareButton from "@/components/ShareButton"
import LeaveLeagueButton from "@/components/leagues/LeaveLeagueButton"

type League = {
  id: string
  name: string
  description: string | null
  type: "global" | "public" | "private"
  invite_code: string | null
  banner_color: string
  is_verified: boolean
  created_by: string | null
  config: { icon?: { style: string; seed: string } } | null
}

type Member = {
  user_id: string
  points: number
  rank: number | null
  joined_at: string
  profiles: {
    username: string
    display_name: string
    avatar_config: unknown
  } | null
}

export default async function LigaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [leagueRes, membersRes, myMembershipRes, activityRes] = await Promise.all([
    supabase.from("leagues").select("*").eq("id", id).single(),
    supabase
      .from("league_members")
      .select("user_id, points, rank, joined_at, profiles(username, display_name, avatar_config)")
      .eq("league_id", id)
      .order("points", { ascending: false }),
    supabase
      .from("league_members")
      .select("user_id")
      .eq("league_id", id)
      .eq("user_id", user!.id)
      .maybeSingle(),
    supabase
      .from("league_activity")
      .select("*")
      .eq("league_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
  ])

  if (!leagueRes.data) notFound()
  const league = leagueRes.data as League
  const members = (membersRes.data ?? []) as unknown as Member[]
  const isMember = !!myMembershipRes.data
  const isCreator = league.created_by === user!.id
  const activities = (activityRes.data ?? []) as unknown as Array<{
    id: string
    user_id: string | null
    action_type: string
    metadata: Record<string, unknown>
    created_at: string
  }>

  const shareText =
    league.type === "private" && league.invite_code
      ? `Te invito a jugar conmigo en la liga "${league.name}" en Golazo. Código: ${league.invite_code}`
      : `Sumate a la liga "${league.name}" en Golazo`

  return (
    <main className="max-w-4xl mx-auto px-4 md:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/ligas"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-white text-sm transition-colors"
        >
          <ArrowLeft size={16} />
          Volver a ligas
        </Link>
        <ShareButton
          title={`Liga "${league.name}" en Golazo`}
          text={shareText}
          variant="compact"
        />
      </div>

      {/* Banner */}
      <div
        className="relative rounded-3xl p-8 mb-6 overflow-hidden border"
        style={{
          background: `linear-gradient(135deg, ${league.banner_color}22 0%, ${league.banner_color}05 100%)`,
          borderColor: league.banner_color + "33",
        }}
      >
        <div
          className="absolute -top-20 -right-20 w-60 h-60 rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: league.banner_color }}
        />
        <div className="relative z-10 flex items-start gap-5">
          <LeagueIcon
            config={league.config?.icon}
            name={league.name}
            id={league.id}
            bannerColor={league.banner_color}
            size={80}
            className="border-2 border-white/10 shadow-2xl"
          />
          <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {league.type === "global" && <Globe size={14} className="text-blue-400" />}
            {league.type === "private" && <Lock size={14} className="text-gray-400" />}
            {league.type === "public" && <Users size={14} className="text-green-400" />}
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              {league.type === "global" ? "Liga Oficial" : league.type === "private" ? "Privada" : "Pública"}
            </span>
            {league.is_verified && <span className="text-yellow-400 text-xs">✓ Verificada</span>}
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white">{league.name}</h1>
          {league.description && (
            <p className="text-gray-400 mt-2 max-w-2xl">{league.description}</p>
          )}
          <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <Users size={14} />
              {members.length} {members.length === 1 ? "miembro" : "miembros"}
            </span>
          </div>
          </div>
        </div>
      </div>

      {/* Acciones */}
      {!isMember && (
        <div className="mb-6">
          <JoinLeagueButton leagueId={league.id} />
        </div>
      )}

      {/* Código de invitación */}
      {isMember && league.type === "private" && league.invite_code && (
        <InviteCodeBox code={league.invite_code} />
      )}

      {/* Tabla de posiciones */}
      <section className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-yellow-400" />
            <h2 className="text-lg font-bold text-white">Tabla de posiciones</h2>
          </div>
          {isCreator && (
            <Link
              href={`/ligas/${league.id}/configurar`}
              className="flex items-center gap-1.5 text-gray-500 hover:text-white text-sm transition-colors"
            >
              <Settings size={14} />
              Configurar
            </Link>
          )}
        </div>

        <LeaderboardTable
          leagueId={league.id}
          initialMembers={members}
          currentUserId={user!.id}
        />
      </section>

      {/* Activity feed */}
      <section className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <ActivityIcon size={18} className="text-blue-400" />
          <h2 className="text-lg font-bold text-white">Actividad reciente</h2>
        </div>
        <ActivityFeed activities={activities} />
      </section>

      {/* Salir de la liga — solo miembros no-creadores, no liga global */}
      {isMember && !isCreator && league.type !== "global" && (
        <div className="mt-12 text-center">
          <LeaveLeagueButton leagueId={league.id} leagueName={league.name} />
        </div>
      )}
    </main>
  )
}

import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { isAdminEmail } from "@/lib/admin"

export const dynamic = "force-dynamic"

const GLOBAL_LEAGUE_ID = "00000000-0000-0000-0000-000000000001"

/**
 * Quién predijo y quién no un partido (solo admin).
 * GET /api/admin/prediction-status?match=<id>
 * Universo = miembros de la Liga Global (todos los usuarios). "Predijo" = tiene
 * predicción para ese partido en cualquier liga.
 */
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const matchId = new URL(request.url).searchParams.get("match")
  if (!matchId) return Response.json({ error: "Falta match" }, { status: 400 })

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [matchRes, membersRes, predsRes] = await Promise.all([
    admin.from("matches").select("home_team, away_team, scheduled_at, status").eq("id", matchId).single(),
    admin
      .from("league_members")
      .select("user_id, profiles(username, display_name)")
      .eq("league_id", GLOBAL_LEAGUE_ID),
    admin.from("predictions").select("user_id").eq("match_id", matchId),
  ])

  const predictedSet = new Set((predsRes.data ?? []).map((p) => (p as { user_id: string }).user_id))
  const members = (membersRes.data ?? []) as unknown as Array<{
    user_id: string
    profiles: { username: string; display_name: string } | null
  }>

  const predicted: string[] = []
  const missing: string[] = []
  for (const m of members) {
    const name = m.profiles?.display_name || m.profiles?.username || "—"
    if (predictedSet.has(m.user_id)) predicted.push(name)
    else missing.push(name)
  }
  predicted.sort((a, b) => a.localeCompare(b))
  missing.sort((a, b) => a.localeCompare(b))

  const match = matchRes.data as { home_team: string; away_team: string } | null

  return Response.json({
    ok: true,
    match: match ? `${match.home_team} vs ${match.away_team}` : "Partido",
    predicted,
    missing,
    predictedCount: predicted.length,
    missingCount: missing.length,
  })
}

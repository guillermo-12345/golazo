import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { isAdminEmail } from "@/lib/admin"

export const dynamic = "force-dynamic"

const GLOBAL_LEAGUE_ID = "00000000-0000-0000-0000-000000000001"

/**
 * Quién completó el Bracket Challenge y quién no (solo admin).
 * GET /api/admin/bracket-status
 * Universo = miembros de la Liga Global. "Hizo el bracket" = tiene una
 * bracket_prediction en cualquier liga con al menos el campeón elegido.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [membersRes, bracketsRes] = await Promise.all([
    admin
      .from("league_members")
      .select("user_id, profiles(username, display_name)")
      .eq("league_id", GLOBAL_LEAGUE_ID),
    admin.from("bracket_predictions").select("user_id, bracket_data"),
  ])

  // Hizo el bracket = tiene predicción con al menos el campeón elegido
  const doneSet = new Set<string>()
  for (const b of (bracketsRes.data ?? []) as Array<{ user_id: string; bracket_data: { champion?: string } | null }>) {
    if (b.bracket_data?.champion) doneSet.add(b.user_id)
  }

  const members = (membersRes.data ?? []) as unknown as Array<{
    user_id: string
    profiles: { username: string; display_name: string } | null
  }>

  const done: string[] = []
  const missing: string[] = []
  for (const m of members) {
    const name = m.profiles?.display_name || m.profiles?.username || "—"
    if (doneSet.has(m.user_id)) done.push(name)
    else missing.push(name)
  }
  done.sort((a, b) => a.localeCompare(b))
  missing.sort((a, b) => a.localeCompare(b))

  return Response.json({
    ok: true,
    done,
    missing,
    doneCount: done.length,
    missingCount: missing.length,
  })
}

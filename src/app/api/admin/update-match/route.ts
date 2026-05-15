import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { isAdminEmail } from "@/lib/admin"

export const dynamic = "force-dynamic"

/**
 * Carga/corrige el resultado de un partido a mano (solo admin).
 * Al setear status='finished' con scores, el trigger recalcula los puntos.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdminEmail(user.email)) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: {
    matchId?: string
    homeScore?: number
    awayScore?: number
    status?: string
  }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid body" }, { status: 400 })
  }

  const { matchId, homeScore, awayScore, status } = body
  if (!matchId || homeScore == null || awayScore == null) {
    return Response.json({ error: "Faltan datos" }, { status: 400 })
  }

  // Service role para poder escribir en matches (RLS solo permite select a usuarios)
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await admin
    .from("matches")
    .update({
      home_score: homeScore,
      away_score: awayScore,
      status: status ?? "finished",
    })
    .eq("id", matchId)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  // El trigger on_match_finished recalcula puntos automáticamente
  return Response.json({ ok: true })
}

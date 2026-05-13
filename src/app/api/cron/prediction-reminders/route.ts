// Cron: avisar a usuarios que no predijeron un partido que está por empezar.
// Corre cada 5 minutos. Avisa cuando faltan ~15 min para el inicio.

import { createClient as createSupabaseClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"
export const maxDuration = 30

export async function GET(request: Request) {
  const auth = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const validCron = cronSecret && auth === `Bearer ${cronSecret}`
  const validService = auth === `Bearer ${serviceKey}`

  if (!validCron && !validService) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey!
  )

  // Ventana: partidos que arrancan entre 13 y 18 minutos a partir de ahora
  // (margen para que aunque el cron se atrase no perdamos avisos, y no duplicar
  //  con la próxima corrida 5 min después)
  const now = new Date()
  const windowStart = new Date(now.getTime() + 13 * 60 * 1000)
  const windowEnd = new Date(now.getTime() + 18 * 60 * 1000)

  const { data: matches } = await supabase
    .from("matches")
    .select("id, home_team, away_team, scheduled_at, home_team_code, away_team_code")
    .eq("status", "scheduled")
    .gte("scheduled_at", windowStart.toISOString())
    .lte("scheduled_at", windowEnd.toISOString())

  const upcoming = (matches ?? []) as Array<{
    id: string
    home_team: string
    away_team: string
    home_team_code: string
    away_team_code: string
    scheduled_at: string
  }>

  if (upcoming.length === 0) {
    return Response.json({ ok: true, sent: 0, reason: "no matches in window" })
  }

  let totalNotifs = 0

  for (const match of upcoming) {
    // Todos los miembros de todas las ligas (cada usuario por liga)
    // Excluir los que ya predijeron este partido en esa liga
    const { data: membersData } = await supabase
      .from("league_members")
      .select("user_id, league_id, leagues(name)")

    const allMembers = (membersData ?? []) as unknown as Array<{
      user_id: string
      league_id: string
      leagues: { name: string } | null
    }>

    // Predicciones existentes para este match
    const { data: existingPreds } = await supabase
      .from("predictions")
      .select("user_id, league_id")
      .eq("match_id", match.id)

    const predicted = new Set(
      (existingPreds ?? []).map((p) => {
        const pp = p as { user_id: string; league_id: string }
        return `${pp.user_id}::${pp.league_id}`
      })
    )

    // Dedup: una sola notif por usuario (aunque le falte en varias ligas)
    const usersToNotify = new Set<string>()
    for (const m of allMembers) {
      if (!predicted.has(`${m.user_id}::${m.league_id}`)) {
        usersToNotify.add(m.user_id)
      }
    }

    if (usersToNotify.size === 0) continue

    // Verificar dedup contra notificaciones ya enviadas hoy para este match
    const { data: alreadyNotified } = await supabase
      .from("notifications")
      .select("user_id")
      .eq("type", "prediction_reminder")
      .contains("metadata", { match_id: match.id })

    const alreadyNotifiedSet = new Set(
      (alreadyNotified ?? []).map((n) => (n as { user_id: string }).user_id)
    )

    const finalUsers = Array.from(usersToNotify).filter((u) => !alreadyNotifiedSet.has(u))

    if (finalUsers.length === 0) continue

    const notifRows = finalUsers.map((userId) => ({
      user_id: userId,
      type: "prediction_reminder",
      title: "⏰ Tu predicción cierra pronto",
      message: `${match.home_team_code} vs ${match.away_team_code} arranca en 15 min`,
      link: `/partidos/${match.id}`,
      metadata: { match_id: match.id },
    }))

    const { error } = await supabase.from("notifications").insert(notifRows)
    if (!error) totalNotifs += notifRows.length
  }

  return Response.json({
    ok: true,
    matches_checked: upcoming.length,
    notifications_sent: totalNotifs,
  })
}

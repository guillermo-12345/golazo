// Cron de Vercel: sync de partidos en vivo cada 2 minutos
// Sólo dispara API-Football cuando hay matches programados o en curso
// para no consumir cuota cuando no hay partidos

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

  // Saltar si no hay partidos en vivo ni programados en la próxima hora
  const now = new Date()
  const oneHour = new Date(now.getTime() + 60 * 60 * 1000)
  const { count } = await supabase
    .from("matches")
    .select("*", { count: "exact", head: true })
    .or(
      `status.eq.live,and(status.eq.scheduled,scheduled_at.lte.${oneHour.toISOString()},scheduled_at.gte.${now.toISOString()})`
    )

  if (!count || count === 0) {
    return Response.json({ cron: "sync-live", skipped: true, reason: "no live/upcoming matches" })
  }

  // Llamar al sync con flag live
  const url = new URL("/api/matches/sync?live=1", request.url)
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${serviceKey}` },
  })

  const data = await res.json()
  return Response.json({ ...data, cron: "sync-live" })
}

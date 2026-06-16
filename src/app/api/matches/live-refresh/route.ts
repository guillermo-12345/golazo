import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * Refresco "casi en vivo" disparado desde el cliente mientras se ve un
 * partido en juego. Cualquier usuario logueado puede llamarlo; internamente
 * corre el sync de ESPN (ventana de hoy) con la service key.
 *
 * Throttle: si ya hubo un sync ESPN en los últimos 60s, no vuelve a pegarle
 * a ESPN (evita saturar si varios miran el partido a la vez). Como el cliente
 * escucha cambios por Realtime, el marcador se actualiza solo apenas entra.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Throttle global: último sync ESPN hace menos de 60s → no repetir
  const { data: last } = await admin
    .from("sync_log")
    .select("started_at")
    .eq("source", "espn")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const lastAt = (last as { started_at: string } | null)?.started_at
  if (lastAt && Date.now() - new Date(lastAt).getTime() < 60_000) {
    return Response.json({ ok: true, throttled: true })
  }

  // Corre el sync ESPN (ventana corta) server-to-server con la service key
  const syncUrl = new URL("/api/matches/sync-espn", request.url)
  const res = await fetch(syncUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

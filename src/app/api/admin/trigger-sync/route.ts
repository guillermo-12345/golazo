import { createClient } from "@/lib/supabase/server"
import { isAdminEmail } from "@/lib/admin"

export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * Dispara el sync de partidos desde el panel de admin.
 * Verifica admin por sesión, luego llama al endpoint de sync con la service key.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdminEmail(user.email)) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const url = new URL(request.url)
  const mode = url.searchParams.get("mode") // "full" | "live" | dry
  const season = url.searchParams.get("season")

  const params = new URLSearchParams()
  if (mode === "live") params.set("live", "1")
  if (season) params.set("season", season)

  const syncUrl = new URL(
    `/api/matches/sync${params.toString() ? "?" + params.toString() : ""}`,
    request.url
  )

  const res = await fetch(syncUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  })

  const data = await res.json()
  return Response.json(data, { status: res.status })
}

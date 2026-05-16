import { createClient } from "@/lib/supabase/server"
import { isAdminEmail } from "@/lib/admin"

export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * Dispara el sync de planteles desde el panel de admin.
 * Verifica admin por sesión, luego llama al endpoint de sync con la service key.
 *
 * Pasa `limit`, `code` y `force` tal cual a /api/players/sync.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdminEmail(user.email)) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const url = new URL(request.url)
  const params = new URLSearchParams()
  const limit = url.searchParams.get("limit")
  const code = url.searchParams.get("code")
  const force = url.searchParams.get("force")
  if (limit) params.set("limit", limit)
  if (code) params.set("code", code)
  if (force) params.set("force", force)

  const syncUrl = new URL(
    `/api/players/sync${params.toString() ? "?" + params.toString() : ""}`,
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

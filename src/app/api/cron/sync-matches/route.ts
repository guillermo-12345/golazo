// Cron de Vercel: sync completo cada 6 horas
// Vercel envía header `Authorization: Bearer <CRON_SECRET>` automáticamente
// Acá lo dejamos pasar si viene del cron de Vercel o si tiene el service role key

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(request: Request) {
  const auth = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const validCron = cronSecret && auth === `Bearer ${cronSecret}`
  const validService = auth === `Bearer ${serviceKey}`

  if (!validCron && !validService) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Llamar al sync interno con el service role
  const url = new URL("/api/matches/sync", request.url)
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
    },
  })

  const data = await res.json()
  return Response.json({ ...data, cron: "sync-matches" })
}

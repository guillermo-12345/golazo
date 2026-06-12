import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { getEspnTeamIdMap, getEspnRoster } from "@/lib/espn/client"

/**
 * Sincroniza los PLANTELES OFICIALES del Mundial desde ESPN.
 *
 * Los planteles de API-Football (plan free) están desactualizados; ESPN
 * publica la lista oficial de 26 convocados por selección, con dorsal y
 * posición. Este sync REEMPLAZA el plantel de cada equipo (borra e
 * inserta) para que no queden jugadores viejos mezclados.
 *
 *  - POST /api/players/sync-espn             → los 48 equipos
 *  - POST /api/players/sync-espn?code=MEX    → solo un equipo
 *  - POST /api/players/sync-espn?dry=1       → no escribe, muestra resumen
 *
 * Auth: header `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`
 */

export const dynamic = "force-dynamic"
export const maxDuration = 60

const MIN_SQUAD_SIZE = 15 // sanity check: no reemplazar con data incompleta

async function authorize(request: Request): Promise<boolean> {
  const auth = request.headers.get("authorization")
  return auth === `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
}

export async function POST(request: Request) {
  if (!(await authorize(request))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const dry = url.searchParams.get("dry") === "1"
  const onlyCode = url.searchParams.get("code")?.toUpperCase() ?? null

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const idMap = await getEspnTeamIdMap()
    const codes = onlyCode ? [onlyCode] : [...idMap.keys()].sort()

    let synced = 0
    let playersTotal = 0
    const skipped: Array<{ code: string; reason: string }> = []

    for (const code of codes) {
      const teamId = idMap.get(code)
      if (!teamId) {
        skipped.push({ code, reason: "sin id ESPN (¿no jugó la primera fecha?)" })
        continue
      }

      let roster
      try {
        roster = await getEspnRoster(teamId)
      } catch {
        skipped.push({ code, reason: "error al traer roster" })
        continue
      }

      if (roster.length < MIN_SQUAD_SIZE) {
        skipped.push({ code, reason: `roster incompleto (${roster.length} jugadores)` })
        continue
      }

      if (!dry) {
        // Reemplazo total del plantel del equipo
        const { error: delErr } = await supabase.from("players").delete().eq("team_code", code)
        if (delErr) throw delErr

        const { error: insErr } = await supabase.from("players").insert(
          roster.map((p) => ({
            team_code: code,
            name: p.name,
            number: p.number,
            position: p.position,
          }))
        )
        if (insErr) throw insErr
      }

      synced++
      playersTotal += roster.length
    }

    return Response.json({
      ok: true,
      source: "espn",
      dry,
      teamsSynced: synced,
      playersTotal,
      skipped: skipped.length > 0 ? skipped : undefined,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("espn players sync error", msg)
    return Response.json({ error: "Sync failed", detail: msg }, { status: 500 })
  }
}

// GET para testing manual desde el browser (solo en desarrollo)
export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "Use POST" }, { status: 405 })
  }
  return POST(request)
}

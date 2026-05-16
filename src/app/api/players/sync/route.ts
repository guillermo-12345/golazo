import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { searchNationalTeam, getTeamSquad } from "@/lib/api-football/client"
import { TEAMS, API_FOOTBALL_NAME_TO_CODE } from "@/lib/teams"

/**
 * Sincroniza el plantel de jugadores de cada selección desde API-Football,
 * para poder elegir el goleador desde una lista (no texto libre).
 *
 *  - POST /api/players/sync                → procesa hasta `limit` selecciones que aún no tienen plantel
 *  - POST /api/players/sync?code=ARG       → solo esa selección
 *  - POST /api/players/sync?limit=10       → tamaño del lote (default 5)
 *  - POST /api/players/sync?force=1        → re-sincroniza aunque ya tenga jugadores
 *  - POST /api/players/sync?dry=1          → no escribe, devuelve resumen
 *
 * Auth: header `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`
 *
 * Diseño RESUMIBLE pensado para el plan free de API-Football (~100 llamadas/día,
 * ~10/min). Cada selección consume 1 llamada (plantel) + 1 si hay que resolver
 * su team id (cacheado en `api_team_ids`). El endpoint saltea las selecciones
 * que ya tienen plantel, así se puede correr varias veces hasta completar las 48.
 */

export const dynamic = "force-dynamic"
export const maxDuration = 60

// Code FIFA -> nombre en inglés para buscar en API-Football.
// Se deriva invirtiendo API_FOOTBALL_NAME_TO_CODE (primer nombre por code = el canónico).
const CODE_TO_API_NAME: Record<string, string> = (() => {
  const map: Record<string, string> = {}
  for (const [name, code] of Object.entries(API_FOOTBALL_NAME_TO_CODE)) {
    if (!map[code]) map[code] = name
  }
  return map
})()

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const THROTTLE_MS = 1500

async function authorize(request: Request): Promise<boolean> {
  const auth = request.headers.get("authorization")
  return auth === `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
}

export async function POST(request: Request) {
  if (!(await authorize(request))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const onlyCode = url.searchParams.get("code")?.toUpperCase() || null
  const force = url.searchParams.get("force") === "1"
  const dry = url.searchParams.get("dry") === "1"
  const limit = Math.max(1, Math.min(48, parseInt(url.searchParams.get("limit") ?? "5", 10) || 5))

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Selecciones que ya tienen plantel (para saltearlas salvo force)
    const { data: existing } = await supabase.from("players").select("team_code")
    const teamsWithPlayers = new Set(
      (existing ?? []).map((r) => (r as { team_code: string }).team_code)
    )

    // Cache de team ids ya resueltos
    const { data: cached } = await supabase
      .from("api_team_ids")
      .select("team_code, api_team_id")
    const idCache = new Map<string, number>(
      (cached ?? []).map((r) => {
        const row = r as { team_code: string; api_team_id: number }
        return [row.team_code, row.api_team_id]
      })
    )

    // Qué selecciones procesar en esta corrida
    let codes = Object.keys(TEAMS)
    if (onlyCode) {
      codes = codes.filter((c) => c === onlyCode)
      if (codes.length === 0) {
        return Response.json({ error: `Código desconocido: ${onlyCode}` }, { status: 400 })
      }
    } else if (!force) {
      codes = codes.filter((c) => !teamsWithPlayers.has(c))
    }
    const pending = codes.length
    codes = codes.slice(0, limit)

    const results: Array<{
      code: string
      status: "synced" | "skipped" | "no_team_id" | "empty_squad" | "error"
      players?: number
      apiTeamId?: number
      detail?: string
    }> = []

    for (const code of codes) {
      if (!force && !onlyCode && teamsWithPlayers.has(code)) {
        results.push({ code, status: "skipped" })
        continue
      }

      try {
        // 1. Resolver team id (cache primero)
        let apiTeamId = idCache.get(code) ?? null
        if (apiTeamId == null) {
          const searchName = CODE_TO_API_NAME[code]
          if (!searchName) {
            results.push({ code, status: "no_team_id", detail: "sin nombre de búsqueda" })
            continue
          }
          apiTeamId = await searchNationalTeam(searchName)
          await sleep(THROTTLE_MS)
          if (apiTeamId == null) {
            results.push({ code, status: "no_team_id", detail: `búsqueda "${searchName}" sin resultado` })
            continue
          }
          if (!dry) {
            await supabase
              .from("api_team_ids")
              .upsert(
                { team_code: code, api_team_id: apiTeamId, resolved_at: new Date().toISOString() },
                { onConflict: "team_code" }
              )
          }
          idCache.set(code, apiTeamId)
        }

        // 2. Traer plantel
        const squad = await getTeamSquad(apiTeamId)
        await sleep(THROTTLE_MS)
        if (squad.length === 0) {
          results.push({ code, status: "empty_squad", apiTeamId })
          continue
        }

        // 3. Upsert jugadores (dedup por nombre dentro de la selección)
        const seen = new Set<string>()
        const rows = squad
          .filter((p) => {
            const key = p.name.trim().toLowerCase()
            if (!p.name?.trim() || seen.has(key)) return false
            seen.add(key)
            return true
          })
          .map((p) => ({
            team_code: code,
            api_player_id: p.id,
            name: p.name.trim(),
            position: p.position ?? null,
            number: p.number ?? null,
          }))

        if (!dry && rows.length > 0) {
          const { error } = await supabase
            .from("players")
            .upsert(rows, { onConflict: "team_code,name" })
          if (error) throw error
        }

        results.push({ code, status: "synced", players: rows.length, apiTeamId })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        results.push({ code, status: "error", detail: msg })
      }
    }

    const synced = results.filter((r) => r.status === "synced").length
    const totalPlayers = results.reduce((s, r) => s + (r.players ?? 0), 0)

    return Response.json({
      ok: true,
      dry,
      processed: codes.length,
      pendingBefore: pending,
      pendingAfter: Math.max(0, pending - synced),
      synced,
      totalPlayers,
      results,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("players sync error", msg)
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

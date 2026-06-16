import { ImageResponse } from "next/og"
import { createClient as createServiceClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

/**
 * Imagen cuadrada (1080×1080) para compartir en WhatsApp: posición y puntos
 * de un usuario en una liga. Solo datos públicos de la tabla (nombre, puesto,
 * puntos). GET /api/share/league-card?league=<id>&user=<id>
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const leagueId = url.searchParams.get("league")
  const userId = url.searchParams.get("user")

  let leagueName = "Liga"
  let displayName = "Jugador"
  let points = 0
  let rank: number | null = null
  let total = 0

  if (leagueId && userId) {
    try {
      const supabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const [lg, mem, prof, cnt] = await Promise.all([
        supabase.from("leagues").select("name").eq("id", leagueId).single(),
        supabase.from("league_members").select("points, rank").eq("league_id", leagueId).eq("user_id", userId).single(),
        supabase.from("profiles").select("display_name").eq("id", userId).single(),
        supabase.from("league_members").select("user_id", { count: "exact", head: true }).eq("league_id", leagueId),
      ])
      leagueName = (lg.data as { name?: string } | null)?.name ?? leagueName
      points = (mem.data as { points?: number } | null)?.points ?? 0
      rank = (mem.data as { rank?: number | null } | null)?.rank ?? null
      displayName = (prof.data as { display_name?: string } | null)?.display_name ?? displayName
      total = cnt.count ?? 0
    } catch {
      // si algo falla, renderiza la tarjeta genérica
    }
  }

  const initial = displayName.charAt(0).toUpperCase()

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(150deg, #0a0a0a 0%, #0a0a0a 55%, #0f3d22 100%)",
          color: "white",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 900, letterSpacing: "-0.04em" }}>
            <span>GOL</span>
            <span style={{ color: "#22c55e" }}>AZO</span>
          </div>
          <div style={{ display: "flex", fontSize: 28, color: "#9ca3af", fontWeight: 700, letterSpacing: "0.1em" }}>
            MUNDIAL 2026
          </div>
        </div>

        {/* Liga */}
        <div style={{ display: "flex", marginTop: 70, fontSize: 40, color: "#9ca3af" }}>
          {leagueName}
        </div>

        {/* Posición grande */}
        <div style={{ display: "flex", alignItems: "flex-end", marginTop: 8 }}>
          <span style={{ fontSize: 240, fontWeight: 900, lineHeight: 1, color: "#facc15" }}>
            {rank ? `#${rank}` : "—"}
          </span>
          {total > 0 && (
            <span style={{ fontSize: 48, color: "#9ca3af", marginLeft: 24, marginBottom: 40 }}>
              de {total}
            </span>
          )}
        </div>

        {/* Puntos */}
        <div style={{ display: "flex", alignItems: "baseline", marginTop: 24 }}>
          <span style={{ fontSize: 96, fontWeight: 900, color: "#22c55e" }}>{points}</span>
          <span style={{ fontSize: 44, color: "#d1d5db", marginLeft: 20 }}>puntos</span>
        </div>

        <div style={{ flex: 1 }} />

        {/* Usuario */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              background: "linear-gradient(135deg, #22c55e, #15803d)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 52,
              fontWeight: 900,
            }}
          >
            {initial}
          </div>
          <span style={{ fontSize: 56, fontWeight: 800, marginLeft: 28 }}>{displayName}</span>
        </div>

        {/* Footer CTA */}
        <div
          style={{
            display: "flex",
            marginTop: 48,
            fontSize: 34,
            color: "#9ca3af",
          }}
        >
          ¿Me ganás? Sumate a la quiniela del Mundial ⚽
        </div>
      </div>
    ),
    { width: 1080, height: 1080 }
  )
}

import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { isAdminEmail } from "@/lib/admin"

export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * Recalcula los puntos de TODOS los partidos terminados (solo admin).
 * Idempotente: recomputa points_earned y totales por liga desde cero, sin
 * duplicar notificaciones. Útil tras cambiar reglas o cuando el extra_data
 * llegó después del primer cálculo.
 */
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdminEmail(user.email)) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await admin.rpc("recalculate_all_finished_matches")
  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ ok: true, matchesRecalculated: data })
}

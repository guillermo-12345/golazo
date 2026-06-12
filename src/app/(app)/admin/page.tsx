import { createClient } from "@/lib/supabase/server"
import { Shield, Users, Trophy, Target, MessageCircle, Activity } from "lucide-react"
import AdminTools from "@/components/admin/AdminTools"
import LocalDateTime from "@/components/LocalDateTime"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  const supabase = await createClient()

  const [
    usersCount,
    leaguesCount,
    predsCount,
    msgsCount,
    syncLogRes,
    recentUsersRes,
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("leagues").select("*", { count: "exact", head: true }),
    supabase.from("predictions").select("*", { count: "exact", head: true }),
    supabase.from("league_messages").select("*", { count: "exact", head: true }),
    supabase
      .from("sync_log")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(8),
    supabase
      .from("profiles")
      .select("username, display_name, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
  ])

  const syncLog = (syncLogRes.data ?? []) as Array<{
    id: string
    source: string
    started_at: string
    finished_at: string | null
    matches_synced: number | null
    error: string | null
  }>
  const recentUsers = (recentUsersRes.data ?? []) as Array<{
    username: string
    display_name: string
    created_at: string
  }>

  return (
    <main className="max-w-4xl mx-auto px-4 md:px-8 py-8">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield size={28} className="text-red-400" />
          <h1 className="text-2xl md:text-3xl font-black text-white">Panel de Admin</h1>
        </div>
        <p className="text-gray-500 text-sm">Acceso exclusivo · Guillermo Ibañez</p>
      </header>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Metric icon={Users} label="Usuarios" value={usersCount.count ?? 0} color="text-green-400" />
        <Metric icon={Trophy} label="Ligas" value={leaguesCount.count ?? 0} color="text-yellow-400" />
        <Metric icon={Target} label="Predicciones" value={predsCount.count ?? 0} color="text-blue-400" />
        <Metric icon={MessageCircle} label="Mensajes" value={msgsCount.count ?? 0} color="text-purple-400" />
      </div>

      {/* Herramientas (client) */}
      <AdminTools />

      {/* Log de sincronización */}
      <section className="mt-8">
        <div className="flex items-center gap-2 mb-3">
          <Activity size={18} className="text-blue-400" />
          <h2 className="text-lg font-bold text-white">Últimas sincronizaciones</h2>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          {syncLog.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6">Sin sincronizaciones todavía</p>
          ) : (
            syncLog.map((log) => (
              <div
                key={log.id}
                className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-b-0 text-sm"
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    log.error ? "bg-red-500" : log.finished_at ? "bg-green-500" : "bg-yellow-500"
                  }`}
                />
                <span className="text-gray-400 text-xs w-16">{log.source}</span>
                <span className="text-gray-500 text-xs flex-1">
                  <LocalDateTime date={log.started_at} formatStr="d MMM HH:mm" />
                </span>
                {log.error ? (
                  <span className="text-red-400 text-xs truncate max-w-[200px]">{log.error}</span>
                ) : (
                  <span className="text-green-400 text-xs">
                    {log.matches_synced ?? 0} partidos
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {/* Últimos usuarios */}
      <section className="mt-8">
        <div className="flex items-center gap-2 mb-3">
          <Users size={18} className="text-green-400" />
          <h2 className="text-lg font-bold text-white">Últimos registrados</h2>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          {recentUsers.map((u) => (
            <div
              key={u.username}
              className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-b-0 text-sm"
            >
              <span className="text-white font-medium flex-1">{u.display_name}</span>
              <span className="text-gray-500 text-xs">@{u.username}</span>
              <span className="text-gray-600 text-xs">
                <LocalDateTime date={u.created_at} formatStr="d MMM" />
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Users
  label: string
  value: number
  color: string
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
      <Icon size={20} className={`${color} mx-auto mb-2`} />
      <p className="text-3xl font-black text-white tabular-nums">{value.toLocaleString("es-AR")}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  )
}

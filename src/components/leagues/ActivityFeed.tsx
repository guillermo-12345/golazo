import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { UserPlus, Sparkles, Target, Trophy, Activity as ActivityIcon } from "lucide-react"

type Activity = {
  id: string
  user_id: string | null
  action_type: string
  metadata: Record<string, unknown>
  created_at: string
}

const ACTION_META: Record<string, { icon: typeof UserPlus; color: string }> = {
  member_joined: { icon: UserPlus, color: "text-green-400" },
  league_created: { icon: Sparkles, color: "text-yellow-400" },
  prediction_made: { icon: Target, color: "text-blue-400" },
  match_finished: { icon: Trophy, color: "text-orange-400" },
}

function getActivityText(a: Activity): string {
  const name = (a.metadata?.display_name as string) || "Alguien"
  const leagueName = a.metadata?.league_name as string | undefined

  switch (a.action_type) {
    case "member_joined":
      return `${name} se unió a la liga`
    case "league_created":
      return `${name} creó la liga${leagueName ? ` "${leagueName}"` : ""}`
    case "prediction_made":
      return `${name} hizo una predicción`
    case "match_finished":
      return `Partido finalizado`
    default:
      return a.action_type.replace(/_/g, " ")
  }
}

export default function ActivityFeed({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
        <ActivityIcon size={28} className="text-gray-600 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Aún no hay actividad en la liga</p>
        <p className="text-gray-600 text-xs mt-1">Cuando se unan miembros y hagan predicciones, verás todo acá</p>
      </div>
    )
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
      {activities.map((a, idx) => {
        const meta = ACTION_META[a.action_type] ?? {
          icon: ActivityIcon,
          color: "text-gray-400",
        }
        const Icon = meta.icon
        return (
          <div
            key={a.id}
            className={`flex items-center gap-3 px-4 py-3 ${
              idx < activities.length - 1 ? "border-b border-white/5" : ""
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
              <Icon size={14} className={meta.color} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-300">{getActivityText(a)}</p>
              <p className="text-xs text-gray-600">
                {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: es })}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

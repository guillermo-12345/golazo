import Avatar from "@/components/Avatar"
import { Crown } from "lucide-react"

/**
 * Corona al ganador de la liga. Si el Mundial terminó, felicita al campeón;
 * si sigue en juego, muestra al puntero actual.
 */
export default function LeagueWinnerBanner({
  displayName,
  username,
  avatarConfig,
  points,
  isChampion,
  isMe,
}: {
  displayName: string
  username?: string
  avatarConfig: unknown
  points: number
  isChampion: boolean
  isMe: boolean
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl mb-6 border border-yellow-500/40 bg-gradient-to-br from-yellow-500/20 via-yellow-500/8 to-transparent p-5">
      <div className="absolute -top-10 -right-6 text-7xl opacity-20 rotate-12 select-none pointer-events-none">
        {isChampion ? "🏆" : "🥇"}
      </div>
      <div className="relative flex items-center gap-4">
        <div className="relative shrink-0">
          <Avatar config={avatarConfig} username={username} size={52} />
          <span className="absolute -top-2 -right-1 text-lg">👑</span>
        </div>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-yellow-400 text-[11px] font-black uppercase tracking-wider">
            <Crown size={12} />
            {isChampion ? "Campeón de la liga" : "Puntero de la liga"}
          </p>
          <p className="text-white font-black text-lg truncate">
            {isChampion ? "🎉 " : ""}
            {displayName}
            {isMe && <span className="text-yellow-400 text-sm font-bold"> (vos)</span>}
          </p>
          <p className="text-gray-300 text-xs">
            {isChampion ? "¡Felicitaciones! " : ""}
            {points} puntos
            {isChampion ? " · ganó el torneo" : " · va primero"}
          </p>
        </div>
      </div>
    </div>
  )
}

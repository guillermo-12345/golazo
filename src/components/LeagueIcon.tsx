import { getLeagueIconUrl } from "@/lib/league-icon"
import { cn } from "@/lib/utils"

type Props = {
  config?: unknown
  name?: string
  id?: string
  bannerColor?: string
  size?: number
  className?: string
}

export default function LeagueIcon({
  config,
  name,
  id,
  bannerColor,
  size = 48,
  className,
}: Props) {
  const url = getLeagueIconUrl(config, { name, id, bannerColor })
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={name ? `Escudo de ${name}` : "Escudo de liga"}
      width={size}
      height={size}
      className={cn("rounded-2xl flex-shrink-0", className)}
      style={{ width: size, height: size }}
    />
  )
}

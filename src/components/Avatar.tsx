import { getAvatarUrl } from "@/lib/avatar"
import { cn } from "@/lib/utils"

type Props = {
  config: unknown
  username?: string
  size?: number
  className?: string
  border?: boolean
}

export default function Avatar({
  config,
  username,
  size = 40,
  className,
  border = false,
}: Props) {
  const url = getAvatarUrl(config, username)
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={username ? `Avatar de ${username}` : "Avatar"}
      width={size}
      height={size}
      className={cn(
        "rounded-full flex-shrink-0",
        border && "border-2 border-white/20",
        className
      )}
      style={{ width: size, height: size }}
    />
  )
}

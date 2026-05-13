import { getFlagUrl, getTeamByCode } from "@/lib/teams"
import { cn } from "@/lib/utils"

type Props = {
  code: string
  size?: number
  className?: string
  showCode?: boolean
  showName?: boolean
}

export default function TeamFlag({
  code,
  size = 40,
  className,
  showCode = false,
  showName = false,
}: Props) {
  const team = getTeamByCode(code)
  const flagUrl = getFlagUrl(code, size <= 40 ? 80 : 160)
  const name = team?.name ?? code

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={flagUrl}
        alt={`Bandera de ${name}`}
        width={size}
        height={size * 0.66}
        className="rounded-md object-cover shadow-md"
        style={{ width: size, height: size * 0.66 }}
      />
      {showCode && <span className="text-xs font-bold text-gray-400">{code}</span>}
      {showName && <span className="text-sm font-medium text-white">{name}</span>}
    </div>
  )
}

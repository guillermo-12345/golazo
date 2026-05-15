"use client"

import { getFlagUrl, getTeamByCode } from "@/lib/teams"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

type Props = {
  code: string
  size?: number
  className?: string
  showCode?: boolean
  showName?: boolean
  /** Si true (default), al tocar la bandera va a /paises/[code]. */
  linkToCountry?: boolean
}

export default function TeamFlag({
  code,
  size = 40,
  className,
  showCode = false,
  showName = false,
  linkToCountry = true,
}: Props) {
  const router = useRouter()
  const team = getTeamByCode(code)
  const flagUrl = getFlagUrl(code, size <= 40 ? 80 : 160)
  const name = team?.name ?? code
  const known = !!team

  // Si el code no es un país conocido (ej: "TBD"), no hacemos clickeable
  const clickable = linkToCountry && known

  function handleClick(e: React.MouseEvent) {
    if (!clickable) return
    // stopPropagation: funciona aunque la bandera esté dentro de otro <Link>
    e.preventDefault()
    e.stopPropagation()
    router.push(`/paises/${code.toUpperCase()}`)
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2",
        clickable && "cursor-pointer",
        className
      )}
      onClick={handleClick}
      role={clickable ? "link" : undefined}
      aria-label={clickable ? `Ver info de ${name}` : undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={flagUrl}
        alt={`Bandera de ${name}`}
        width={size}
        height={size * 0.66}
        className={cn(
          "rounded-md object-cover shadow-md",
          clickable && "hover:ring-2 hover:ring-green-500/50 transition-all"
        )}
        style={{ width: size, height: size * 0.66 }}
      />
      {showCode && <span className="text-xs font-bold text-gray-400">{code}</span>}
      {showName && <span className="text-sm font-medium text-white">{name}</span>}
    </div>
  )
}

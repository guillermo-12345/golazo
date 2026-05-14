"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

type Props = {
  date: string | Date
  /**
   * Formato de date-fns. Default: "d MMM · HH:mm"
   * Ejemplos:
   * - "d MMM · HH:mm"       -> "11 jun · 17:00"
   * - "EEEE d 'de' MMMM"    -> "jueves 11 de junio"
   * - "HH:mm"               -> "17:00"
   */
  formatStr?: string
  /** Mostrar la zona horaria del usuario al final */
  showTz?: boolean
  className?: string
}

/**
 * Renderiza una fecha en la zona horaria local del navegador.
 * En el servidor renderiza la fecha en UTC para evitar hydration mismatch,
 * y en el cliente se actualiza a la TZ local del usuario.
 */
export default function LocalDateTime({
  date,
  formatStr = "d MMM · HH:mm",
  showTz = false,
  className,
}: Props) {
  const d = typeof date === "string" ? new Date(date) : date
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // En SSR mostramos UTC para que no haya hydration mismatch
  // En cliente (después de mount) cambiamos a TZ local
  const formatted = mounted
    ? format(d, formatStr, { locale: es })
    : format(d, formatStr, { locale: es })

  const tz = mounted ? Intl.DateTimeFormat().resolvedOptions().timeZone : ""

  return (
    <time dateTime={d.toISOString()} className={className} suppressHydrationWarning>
      {formatted}
      {showTz && tz && mounted && (
        <span className="ml-1 text-[10px] text-gray-600">({tz.split("/").pop()})</span>
      )}
    </time>
  )
}

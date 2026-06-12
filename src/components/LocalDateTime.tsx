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
 * Vista de la fecha con la pared horaria de UTC, independiente de la TZ del
 * runtime. Así el primer render del cliente produce el mismo string que el
 * SSR (que corre en UTC en Vercel) y React sí aplica el cambio a TZ local
 * después del mount. Sin esto, el texto UTC del servidor quedaba congelado:
 * la hidratación ya calculaba la hora local, el re-render post-mount no
 * detectaba diferencia y el DOM nunca se actualizaba.
 */
function utcView(d: Date): Date {
  return new Date(d.getTime() + d.getTimezoneOffset() * 60000)
}

/**
 * Renderiza una fecha en la zona horaria local del navegador.
 * En el servidor (y la hidratación) renderiza la fecha en UTC para evitar
 * hydration mismatch, y tras el mount se actualiza a la TZ local del usuario.
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

  const formatted = format(mounted ? d : utcView(d), formatStr, { locale: es })

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

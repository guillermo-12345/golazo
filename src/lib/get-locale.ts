import { headers } from "next/headers"
import { detectLocale, type Locale } from "./i18n"

/**
 * Obtiene el locale del usuario en server components.
 * Vercel agrega un header `x-vercel-ip-country` con el código ISO 2-letter.
 * En desarrollo local devuelve "es-AR" por default.
 */
export async function getLocale(): Promise<Locale> {
  const headersList = await headers()
  const country = headersList.get("x-vercel-ip-country")
  return detectLocale(country)
}

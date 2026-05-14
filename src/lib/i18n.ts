// Sistema de internacionalización por región.
// Detectamos Argentina/Uruguay para usar rioplatense + "Prode",
// y para el resto de LatAm usamos español neutral + "Quiniela".

export type Locale = "es-AR" | "es"

const RIOPLATENSE_COUNTRIES = ["AR", "UY"] as const

/**
 * Detecta el locale a partir del código de país (ISO 3166-1 alpha-2).
 * Vercel lo expone vía `request.geo.country`.
 */
export function detectLocale(country?: string | null): Locale {
  if (!country) return "es-AR" // default rioplatense (el creador es argentino)
  return RIOPLATENSE_COUNTRIES.includes(country as "AR" | "UY") ? "es-AR" : "es"
}

type CopyMap = Record<string, { "es-AR": string; "es": string }>

export const COPY: CopyMap = {
  // App branding
  appWord: { "es-AR": "Prode", "es": "Quiniela" },
  appTagline: {
    "es-AR": "La prode más épica del Mundial",
    "es": "La quiniela más épica del Mundial",
  },
  appSubtitle: {
    "es-AR": "Prode del Mundial 2026",
    "es": "Quiniela del Mundial 2026",
  },

  // CTAs principales
  ctaPlay: { "es-AR": "Jugá gratis", "es": "Juega gratis" },
  ctaStart: { "es-AR": "Empezar ahora", "es": "Empezar ahora" },
  ctaEnter: { "es-AR": "Entrá a jugar", "es": "Entra a jugar" },

  // Acciones comunes
  predict: { "es-AR": "Predecí", "es": "Predice" },
  predictAction: { "es-AR": "Predecir", "es": "Predecir" },
  participate: { "es-AR": "Participá", "es": "Participa" },
  win: { "es-AR": "Ganá", "es": "Gana" },
  create: { "es-AR": "Creá", "es": "Crea" },
  join: { "es-AR": "Unite", "es": "Únete" },
  share: { "es-AR": "Compartí", "es": "Comparte" },
  invite: { "es-AR": "Invitá", "es": "Invita" },

  // Mensajes
  readyToPredict: {
    "es-AR": "¿Listo para predecir los próximos partidos?",
    "es": "¿Listo para predecir los próximos partidos?",
  },
  predictMore: {
    "es-AR": "Predecí resultados, competí en ligas privadas con tus amigos, usá comodines y demostrá que sabés más de fútbol que nadie.",
    "es": "Predice resultados, compite en ligas privadas con tus amigos, usa comodines y demuestra que sabes más de fútbol que nadie.",
  },
  // Hero landing
  heroLine1: { "es-AR": "La prode", "es": "La quiniela" },
  heroLine2: { "es-AR": "más épica", "es": "más épica" },
  heroLine3: { "es-AR": "del Mundial", "es": "del Mundial" },

  // Footer / créditos
  developedBy: { "es-AR": "Desarrollado con ❤ por", "es": "Desarrollado con ❤ por" },
}

/**
 * Helper para obtener una clave traducida.
 */
export function t(key: keyof typeof COPY, locale: Locale = "es-AR"): string {
  const entry = COPY[key]
  if (!entry) return key
  return entry[locale] ?? entry["es-AR"]
}

/**
 * Capitaliza la primera letra (útil para casos donde tomamos copy en minúscula).
 */
export function capitalize(s: string): string {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}

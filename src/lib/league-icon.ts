// Escudos/iconos generados para ligas (DiceBear)
// Usamos estilos que se ven como logos/escudos de equipos

export type LeagueIconStyle = "shapes" | "identicon" | "thumbs" | "initials" | "rings" | "icons"

export type LeagueIconConfig = {
  style: LeagueIconStyle
  seed: string
}

export const LEAGUE_ICON_STYLES: { value: LeagueIconStyle; label: string }[] = [
  { value: "shapes", label: "Formas" },
  { value: "rings", label: "Aros" },
  { value: "identicon", label: "Pixel" },
  { value: "initials", label: "Letras" },
  { value: "icons", label: "Iconos" },
  { value: "thumbs", label: "Pulgar" },
]

export const DEFAULT_LEAGUE_ICON: LeagueIconConfig = {
  style: "shapes",
  seed: "golazo-league",
}

/**
 * Construye la URL del escudo de la liga.
 * Si no hay config, deriva el seed del nombre de la liga.
 */
export function getLeagueIconUrl(
  config: unknown,
  fallback: { name?: string; id?: string; bannerColor?: string }
): string {
  const c = (config ?? {}) as Partial<LeagueIconConfig>
  const style = c.style ?? "shapes"
  const seed = c.seed ?? fallback.name ?? fallback.id ?? "golazo"

  const params = new URLSearchParams({
    seed,
    radius: "50",
  })

  // Para "initials" mostramos las primeras letras del nombre
  if (style === "initials" && fallback.name) {
    params.set("seed", fallback.name)
  }

  // Color de fondo basado en el banner_color de la liga
  if (fallback.bannerColor) {
    params.set("backgroundColor", fallback.bannerColor.replace("#", ""))
  }

  return `https://api.dicebear.com/9.x/${style}/svg?${params.toString()}`
}

export function randomLeagueSeed(): string {
  return Math.random().toString(36).slice(2, 10)
}

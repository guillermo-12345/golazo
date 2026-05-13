// Sistema de avatares basado en DiceBear (gratis, sin API key)
// https://www.dicebear.com/

export type AvatarStyle =
  | "avataaars"
  | "lorelei"
  | "notionists"
  | "fun-emoji"
  | "bottts"
  | "adventurer"
  | "micah"
  | "personas"

export type AvatarConfig = {
  style: AvatarStyle
  seed: string
  backgroundColor: string // hex sin '#'
}

export const AVATAR_STYLES: { value: AvatarStyle; label: string }[] = [
  { value: "avataaars", label: "Clásico" },
  { value: "adventurer", label: "Aventurero" },
  { value: "micah", label: "Moderno" },
  { value: "notionists", label: "Notion" },
  { value: "lorelei", label: "Retrato" },
  { value: "personas", label: "Persona" },
  { value: "fun-emoji", label: "Emoji" },
  { value: "bottts", label: "Robot" },
]

export const AVATAR_BACKGROUNDS = [
  "16a34a", // verde
  "2563eb", // azul
  "dc2626", // rojo
  "7c3aed", // violeta
  "ea580c", // naranja
  "0891b2", // celeste
  "f59e0b", // amarillo
  "ec4899", // rosa
  "111827", // negro
  "f3f4f6", // gris claro
]

export const DEFAULT_AVATAR: AvatarConfig = {
  style: "avataaars",
  seed: "golazo",
  backgroundColor: "16a34a",
}

/**
 * Construye la URL del avatar de DiceBear.
 * Acepta tanto el nuevo formato como el viejo (con jerseyColor) por compatibilidad.
 */
export function getAvatarUrl(config: unknown, fallbackSeed?: string): string {
  const c = (config ?? {}) as Partial<AvatarConfig> & { jerseyColor?: string }

  const style: AvatarStyle = c.style ?? "avataaars"
  const seed = c.seed ?? fallbackSeed ?? DEFAULT_AVATAR.seed
  const backgroundColor =
    c.backgroundColor ??
    (c.jerseyColor ? c.jerseyColor.replace("#", "") : DEFAULT_AVATAR.backgroundColor)

  const params = new URLSearchParams({
    seed,
    backgroundColor,
    radius: "50",
  })

  return `https://api.dicebear.com/9.x/${style}/svg?${params.toString()}`
}

/**
 * Genera un seed aleatorio (para el botón "shuffle")
 */
export function randomSeed(): string {
  return Math.random().toString(36).slice(2, 10)
}

/**
 * Extrae el color de fondo del avatar para usar como acento visual
 */
export function getAvatarBgHex(config: unknown): string {
  const c = (config ?? {}) as Partial<AvatarConfig> & { jerseyColor?: string }
  const bg =
    c.backgroundColor ??
    (c.jerseyColor ? c.jerseyColor.replace("#", "") : DEFAULT_AVATAR.backgroundColor)
  return `#${bg}`
}

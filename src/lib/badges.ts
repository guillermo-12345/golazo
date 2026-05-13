// Catálogo de badges/logros de Golazo

export type BadgeType =
  | "bienvenido"          // se registró
  | "estratega"           // creó su primera liga
  | "companero"           // se unió a una liga con código
  | "predictor"           // hizo su primera predicción
  | "adivino"             // 3 resultados exactos
  | "racha_cinco"         // 5 aciertos seguidos
  | "racha_diez"          // 10 aciertos seguidos
  | "apostador"           // ganó 3 apuestas avanzadas
  | "bracket_master"      // completó el bracket challenge
  | "campeon"             // terminó #1 en una liga
  | "reclutador"          // 3 personas se unieron con su código
  | "mil_puntos"          // alcanzó 1000 puntos en una liga
  | "patriota"            // acertó la final de su selección
  | "vidente"             // acertó al campeón del mundial

export type BadgeMeta = {
  type: BadgeType
  name: string
  description: string
  emoji: string
  color: string // hex sin #
  rarity: "common" | "rare" | "epic" | "legendary"
}

export const BADGE_CATALOG: Record<BadgeType, BadgeMeta> = {
  bienvenido: {
    type: "bienvenido",
    name: "Bienvenido",
    description: "Te registraste en Golazo",
    emoji: "👋",
    color: "16a34a",
    rarity: "common",
  },
  estratega: {
    type: "estratega",
    name: "Estratega",
    description: "Creaste tu primera liga",
    emoji: "🎯",
    color: "2563eb",
    rarity: "common",
  },
  companero: {
    type: "companero",
    name: "Compañero",
    description: "Te uniste a una liga con código de invitación",
    emoji: "🤝",
    color: "0891b2",
    rarity: "common",
  },
  predictor: {
    type: "predictor",
    name: "Predictor",
    description: "Hiciste tu primera predicción",
    emoji: "🔮",
    color: "7c3aed",
    rarity: "common",
  },
  adivino: {
    type: "adivino",
    name: "Adivino",
    description: "Acertaste 3 resultados exactos",
    emoji: "✨",
    color: "f59e0b",
    rarity: "rare",
  },
  racha_cinco: {
    type: "racha_cinco",
    name: "Imparable",
    description: "5 predicciones acertadas seguidas",
    emoji: "🔥",
    color: "ea580c",
    rarity: "rare",
  },
  racha_diez: {
    type: "racha_diez",
    name: "En llamas",
    description: "10 predicciones acertadas seguidas",
    emoji: "💥",
    color: "dc2626",
    rarity: "epic",
  },
  apostador: {
    type: "apostador",
    name: "Apostador",
    description: "Ganaste 3 apuestas avanzadas seguidas",
    emoji: "🎰",
    color: "ec4899",
    rarity: "rare",
  },
  bracket_master: {
    type: "bracket_master",
    name: "Bracket Master",
    description: "Completaste el Bracket Challenge",
    emoji: "🏆",
    color: "f59e0b",
    rarity: "rare",
  },
  campeon: {
    type: "campeon",
    name: "Campeón",
    description: "Terminaste #1 en una liga",
    emoji: "👑",
    color: "facc15",
    rarity: "legendary",
  },
  reclutador: {
    type: "reclutador",
    name: "Reclutador",
    description: "3 personas se unieron con tu código",
    emoji: "📣",
    color: "0891b2",
    rarity: "rare",
  },
  mil_puntos: {
    type: "mil_puntos",
    name: "Mil puntos",
    description: "Alcanzaste 1000 puntos en una liga",
    emoji: "💎",
    color: "06b6d4",
    rarity: "epic",
  },
  patriota: {
    type: "patriota",
    name: "Patriota",
    description: "Acertaste la final de tu selección favorita",
    emoji: "🇦🇷",
    color: "60a5fa",
    rarity: "epic",
  },
  vidente: {
    type: "vidente",
    name: "Vidente",
    description: "Predijiste correctamente al campeón del Mundial",
    emoji: "🌟",
    color: "facc15",
    rarity: "legendary",
  },
}

export const ALL_BADGES = Object.values(BADGE_CATALOG)

export const RARITY_LABEL: Record<BadgeMeta["rarity"], string> = {
  common: "Común",
  rare: "Raro",
  epic: "Épico",
  legendary: "Legendario",
}

export const RARITY_BORDER: Record<BadgeMeta["rarity"], string> = {
  common: "border-gray-500/30",
  rare: "border-blue-500/40",
  epic: "border-purple-500/40",
  legendary: "border-yellow-500/50",
}

export const RARITY_GLOW: Record<BadgeMeta["rarity"], string> = {
  common: "",
  rare: "shadow-[0_0_20px_rgba(59,130,246,0.2)]",
  epic: "shadow-[0_0_25px_rgba(168,85,247,0.25)]",
  legendary: "shadow-[0_0_30px_rgba(250,204,21,0.35)]",
}

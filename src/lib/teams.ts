// Mapping FIFA 3-letter code -> ISO 3166-1 alpha-2 (para flagcdn.com)
// + info adicional de los 48 equipos del Mundial 2026

export type TeamInfo = {
  name: string
  fifaCode: string
  isoCode: string
  group?: string
}

export const TEAMS: Record<string, TeamInfo> = {
  // Grupo A
  MEX: { name: "México", fifaCode: "MEX", isoCode: "mx", group: "A" },
  BRA: { name: "Brasil", fifaCode: "BRA", isoCode: "br", group: "A" },
  CRO: { name: "Croacia", fifaCode: "CRO", isoCode: "hr", group: "A" },
  CMR: { name: "Camerún", fifaCode: "CMR", isoCode: "cm", group: "A" },

  // Grupo B
  CAN: { name: "Canadá", fifaCode: "CAN", isoCode: "ca", group: "B" },
  BEL: { name: "Bélgica", fifaCode: "BEL", isoCode: "be", group: "B" },
  SUI: { name: "Suiza", fifaCode: "SUI", isoCode: "ch", group: "B" },
  ALG: { name: "Argelia", fifaCode: "ALG", isoCode: "dz", group: "B" },

  // Grupo C
  USA: { name: "Estados Unidos", fifaCode: "USA", isoCode: "us", group: "C" },
  ARG: { name: "Argentina", fifaCode: "ARG", isoCode: "ar", group: "C" },
  ISL: { name: "Islandia", fifaCode: "ISL", isoCode: "is", group: "C" },
  TUN: { name: "Túnez", fifaCode: "TUN", isoCode: "tn", group: "C" },

  // Grupo D
  FRA: { name: "Francia", fifaCode: "FRA", isoCode: "fr", group: "D" },
  DEN: { name: "Dinamarca", fifaCode: "DEN", isoCode: "dk", group: "D" },
  KSA: { name: "Arabia Saudita", fifaCode: "KSA", isoCode: "sa", group: "D" },
  AUS: { name: "Australia", fifaCode: "AUS", isoCode: "au", group: "D" },

  // Grupo E
  ESP: { name: "España", fifaCode: "ESP", isoCode: "es", group: "E" },
  URU: { name: "Uruguay", fifaCode: "URU", isoCode: "uy", group: "E" },
  SRB: { name: "Serbia", fifaCode: "SRB", isoCode: "rs", group: "E" },
  CRC: { name: "Costa Rica", fifaCode: "CRC", isoCode: "cr", group: "E" },

  // Grupo F
  GER: { name: "Alemania", fifaCode: "GER", isoCode: "de", group: "F" },
  JPN: { name: "Japón", fifaCode: "JPN", isoCode: "jp", group: "F" },
  MAR: { name: "Marruecos", fifaCode: "MAR", isoCode: "ma", group: "F" },
  EGY: { name: "Egipto", fifaCode: "EGY", isoCode: "eg", group: "F" },

  // Grupo G
  ENG: { name: "Inglaterra", fifaCode: "ENG", isoCode: "gb-eng", group: "G" },
  POL: { name: "Polonia", fifaCode: "POL", isoCode: "pl", group: "G" },
  KOR: { name: "Corea del Sur", fifaCode: "KOR", isoCode: "kr", group: "G" },
  GHA: { name: "Ghana", fifaCode: "GHA", isoCode: "gh", group: "G" },

  // Grupo H
  POR: { name: "Portugal", fifaCode: "POR", isoCode: "pt", group: "H" },
  ECU: { name: "Ecuador", fifaCode: "ECU", isoCode: "ec", group: "H" },
  IRN: { name: "Irán", fifaCode: "IRN", isoCode: "ir", group: "H" },
  NZL: { name: "Nueva Zelanda", fifaCode: "NZL", isoCode: "nz", group: "H" },

  // Grupo I
  NED: { name: "Países Bajos", fifaCode: "NED", isoCode: "nl", group: "I" },
  COL: { name: "Colombia", fifaCode: "COL", isoCode: "co", group: "I" },
  QAT: { name: "Qatar", fifaCode: "QAT", isoCode: "qa", group: "I" },
  BOL: { name: "Bolivia", fifaCode: "BOL", isoCode: "bo", group: "I" },

  // Grupo J
  ITA: { name: "Italia", fifaCode: "ITA", isoCode: "it", group: "J" },
  PER: { name: "Perú", fifaCode: "PER", isoCode: "pe", group: "J" },
  WAL: { name: "Gales", fifaCode: "WAL", isoCode: "gb-wls", group: "J" },
  CIV: { name: "Costa de Marfil", fifaCode: "CIV", isoCode: "ci", group: "J" },

  // Grupo K
  NOR: { name: "Noruega", fifaCode: "NOR", isoCode: "no", group: "K" },
  CHI: { name: "Chile", fifaCode: "CHI", isoCode: "cl", group: "K" },
  HON: { name: "Honduras", fifaCode: "HON", isoCode: "hn", group: "K" },
  SEN: { name: "Senegal", fifaCode: "SEN", isoCode: "sn", group: "K" },

  // Grupo L
  UKR: { name: "Ucrania", fifaCode: "UKR", isoCode: "ua", group: "L" },
  PAN: { name: "Panamá", fifaCode: "PAN", isoCode: "pa", group: "L" },
  TUR: { name: "Turquía", fifaCode: "TUR", isoCode: "tr", group: "L" },
  NGA: { name: "Nigeria", fifaCode: "NGA", isoCode: "ng", group: "L" },
}

export function getTeamByCode(code: string): TeamInfo | null {
  return TEAMS[code.toUpperCase()] ?? null
}

export function getFlagUrl(fifaCode: string, size: 20 | 40 | 80 | 160 | 320 = 80): string {
  const team = TEAMS[fifaCode.toUpperCase()]
  if (!team) return `https://flagcdn.com/w${size}/un.png` // bandera ONU placeholder
  return `https://flagcdn.com/w${size}/${team.isoCode}.png`
}

export function getTeamsByGroup(letter: string): TeamInfo[] {
  return Object.values(TEAMS).filter((t) => t.group === letter.toUpperCase())
}

export const GROUP_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"] as const

// Mapping FIFA 3-letter code -> ISO 3166-1 alpha-2 (para flagcdn.com)
// 48 selecciones clasificadas al Mundial 2026 (mejor estimación con bombo balanceado)

export type TeamInfo = {
  name: string
  fifaCode: string
  isoCode: string
  group?: string
}

export const TEAMS: Record<string, TeamInfo> = {
  // ───── Grupo A (Estadio Azteca, CDMX)
  MEX: { name: "México", fifaCode: "MEX", isoCode: "mx", group: "A" },
  CRO: { name: "Croacia", fifaCode: "CRO", isoCode: "hr", group: "A" },
  CMR: { name: "Camerún", fifaCode: "CMR", isoCode: "cm", group: "A" },
  KSA: { name: "Arabia Saudita", fifaCode: "KSA", isoCode: "sa", group: "A" },

  // ───── Grupo B (BMO Field, Toronto)
  CAN: { name: "Canadá", fifaCode: "CAN", isoCode: "ca", group: "B" },
  MAR: { name: "Marruecos", fifaCode: "MAR", isoCode: "ma", group: "B" },
  NOR: { name: "Noruega", fifaCode: "NOR", isoCode: "no", group: "B" },
  ECU: { name: "Ecuador", fifaCode: "ECU", isoCode: "ec", group: "B" },

  // ───── Grupo C (MetLife Stadium, New Jersey)
  USA: { name: "Estados Unidos", fifaCode: "USA", isoCode: "us", group: "C" },
  IRN: { name: "Irán", fifaCode: "IRN", isoCode: "ir", group: "C" },
  EGY: { name: "Egipto", fifaCode: "EGY", isoCode: "eg", group: "C" },
  PAR: { name: "Paraguay", fifaCode: "PAR", isoCode: "py", group: "C" },

  // ───── Grupo D (SoFi Stadium, Los Angeles)
  ARG: { name: "Argentina", fifaCode: "ARG", isoCode: "ar", group: "D" },
  SEN: { name: "Senegal", fifaCode: "SEN", isoCode: "sn", group: "D" },
  AUT: { name: "Austria", fifaCode: "AUT", isoCode: "at", group: "D" },
  NZL: { name: "Nueva Zelanda", fifaCode: "NZL", isoCode: "nz", group: "D" },

  // ───── Grupo E (Mercedes-Benz Stadium, Atlanta)
  FRA: { name: "Francia", fifaCode: "FRA", isoCode: "fr", group: "E" },
  ITA: { name: "Italia", fifaCode: "ITA", isoCode: "it", group: "E" },
  ALG: { name: "Argelia", fifaCode: "ALG", isoCode: "dz", group: "E" },
  IRQ: { name: "Iraq", fifaCode: "IRQ", isoCode: "iq", group: "E" },

  // ───── Grupo F (Levi's Stadium, San Francisco)
  ESP: { name: "España", fifaCode: "ESP", isoCode: "es", group: "F" },
  JPN: { name: "Japón", fifaCode: "JPN", isoCode: "jp", group: "F" },
  TUR: { name: "Turquía", fifaCode: "TUR", isoCode: "tr", group: "F" },
  CRC: { name: "Costa Rica", fifaCode: "CRC", isoCode: "cr", group: "F" },

  // ───── Grupo G (AT&T Stadium, Dallas)
  ENG: { name: "Inglaterra", fifaCode: "ENG", isoCode: "gb-eng", group: "G" },
  COL: { name: "Colombia", fifaCode: "COL", isoCode: "co", group: "G" },
  GHA: { name: "Ghana", fifaCode: "GHA", isoCode: "gh", group: "G" },
  UZB: { name: "Uzbekistán", fifaCode: "UZB", isoCode: "uz", group: "G" },

  // ───── Grupo H (NRG Stadium, Houston)
  BRA: { name: "Brasil", fifaCode: "BRA", isoCode: "br", group: "H" },
  SUI: { name: "Suiza", fifaCode: "SUI", isoCode: "ch", group: "H" },
  POL: { name: "Polonia", fifaCode: "POL", isoCode: "pl", group: "H" },
  JOR: { name: "Jordania", fifaCode: "JOR", isoCode: "jo", group: "H" },

  // ───── Grupo I (Arrowhead Stadium, Kansas City)
  POR: { name: "Portugal", fifaCode: "POR", isoCode: "pt", group: "I" },
  KOR: { name: "Corea del Sur", fifaCode: "KOR", isoCode: "kr", group: "I" },
  CZE: { name: "Chequia", fifaCode: "CZE", isoCode: "cz", group: "I" },
  PAN: { name: "Panamá", fifaCode: "PAN", isoCode: "pa", group: "I" },

  // ───── Grupo J (Lincoln Financial Field, Philadelphia)
  NED: { name: "Países Bajos", fifaCode: "NED", isoCode: "nl", group: "J" },
  URU: { name: "Uruguay", fifaCode: "URU", isoCode: "uy", group: "J" },
  TUN: { name: "Túnez", fifaCode: "TUN", isoCode: "tn", group: "J" },
  HON: { name: "Honduras", fifaCode: "HON", isoCode: "hn", group: "J" },

  // ───── Grupo K (Hard Rock Stadium, Miami)
  BEL: { name: "Bélgica", fifaCode: "BEL", isoCode: "be", group: "K" },
  AUS: { name: "Australia", fifaCode: "AUS", isoCode: "au", group: "K" },
  CIV: { name: "Costa de Marfil", fifaCode: "CIV", isoCode: "ci", group: "K" },
  VEN: { name: "Venezuela", fifaCode: "VEN", isoCode: "ve", group: "K" },

  // ───── Grupo L (Estadio Akron, Guadalajara)
  GER: { name: "Alemania", fifaCode: "GER", isoCode: "de", group: "L" },
  DEN: { name: "Dinamarca", fifaCode: "DEN", isoCode: "dk", group: "L" },
  NGA: { name: "Nigeria", fifaCode: "NGA", isoCode: "ng", group: "L" },
  COD: { name: "RD del Congo", fifaCode: "COD", isoCode: "cd", group: "L" },
}

export function getTeamByCode(code: string): TeamInfo | null {
  return TEAMS[code.toUpperCase()] ?? null
}

export function getFlagUrl(fifaCode: string, size: 20 | 40 | 80 | 160 | 320 = 80): string {
  const team = TEAMS[fifaCode.toUpperCase()]
  if (!team) return `https://flagcdn.com/w${size}/un.png`
  return `https://flagcdn.com/w${size}/${team.isoCode}.png`
}

export function getTeamsByGroup(letter: string): TeamInfo[] {
  return Object.values(TEAMS).filter((t) => t.group === letter.toUpperCase())
}

export const GROUP_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"] as const

export const GROUP_VENUES: Record<string, string> = {
  A: "Estadio Azteca, Ciudad de México",
  B: "BMO Field, Toronto",
  C: "MetLife Stadium, Nueva Jersey",
  D: "SoFi Stadium, Los Ángeles",
  E: "Mercedes-Benz Stadium, Atlanta",
  F: "Levi's Stadium, San Francisco",
  G: "AT&T Stadium, Dallas",
  H: "NRG Stadium, Houston",
  I: "Arrowhead Stadium, Kansas City",
  J: "Lincoln Financial Field, Filadelfia",
  K: "Hard Rock Stadium, Miami",
  L: "Estadio Akron, Guadalajara",
}

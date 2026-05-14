// Mapping FIFA 3-letter code -> ISO 3166-1 alpha-2 (para flagcdn.com)
// 48 selecciones clasificadas al Mundial 2026, según el sorteo oficial.

export type TeamInfo = {
  name: string
  fifaCode: string
  isoCode: string
  group?: string
}

export const TEAMS: Record<string, TeamInfo> = {
  // ───── Grupo A
  MEX: { name: "México", fifaCode: "MEX", isoCode: "mx", group: "A" },
  RSA: { name: "Sudáfrica", fifaCode: "RSA", isoCode: "za", group: "A" },
  KOR: { name: "Corea del Sur", fifaCode: "KOR", isoCode: "kr", group: "A" },
  CZE: { name: "Chequia", fifaCode: "CZE", isoCode: "cz", group: "A" },

  // ───── Grupo B
  CAN: { name: "Canadá", fifaCode: "CAN", isoCode: "ca", group: "B" },
  BIH: { name: "Bosnia y Herzegovina", fifaCode: "BIH", isoCode: "ba", group: "B" },
  QAT: { name: "Qatar", fifaCode: "QAT", isoCode: "qa", group: "B" },
  SUI: { name: "Suiza", fifaCode: "SUI", isoCode: "ch", group: "B" },

  // ───── Grupo C
  BRA: { name: "Brasil", fifaCode: "BRA", isoCode: "br", group: "C" },
  MAR: { name: "Marruecos", fifaCode: "MAR", isoCode: "ma", group: "C" },
  HAI: { name: "Haití", fifaCode: "HAI", isoCode: "ht", group: "C" },
  SCO: { name: "Escocia", fifaCode: "SCO", isoCode: "gb-sct", group: "C" },

  // ───── Grupo D
  USA: { name: "Estados Unidos", fifaCode: "USA", isoCode: "us", group: "D" },
  PAR: { name: "Paraguay", fifaCode: "PAR", isoCode: "py", group: "D" },
  AUS: { name: "Australia", fifaCode: "AUS", isoCode: "au", group: "D" },
  TUR: { name: "Turquía", fifaCode: "TUR", isoCode: "tr", group: "D" },

  // ───── Grupo E
  GER: { name: "Alemania", fifaCode: "GER", isoCode: "de", group: "E" },
  CUW: { name: "Curazao", fifaCode: "CUW", isoCode: "cw", group: "E" },
  CIV: { name: "Costa de Marfil", fifaCode: "CIV", isoCode: "ci", group: "E" },
  ECU: { name: "Ecuador", fifaCode: "ECU", isoCode: "ec", group: "E" },

  // ───── Grupo F
  NED: { name: "Países Bajos", fifaCode: "NED", isoCode: "nl", group: "F" },
  JPN: { name: "Japón", fifaCode: "JPN", isoCode: "jp", group: "F" },
  SWE: { name: "Suecia", fifaCode: "SWE", isoCode: "se", group: "F" },
  TUN: { name: "Túnez", fifaCode: "TUN", isoCode: "tn", group: "F" },

  // ───── Grupo G
  BEL: { name: "Bélgica", fifaCode: "BEL", isoCode: "be", group: "G" },
  EGY: { name: "Egipto", fifaCode: "EGY", isoCode: "eg", group: "G" },
  IRN: { name: "Irán", fifaCode: "IRN", isoCode: "ir", group: "G" },
  NZL: { name: "Nueva Zelanda", fifaCode: "NZL", isoCode: "nz", group: "G" },

  // ───── Grupo H
  ESP: { name: "España", fifaCode: "ESP", isoCode: "es", group: "H" },
  CPV: { name: "Cabo Verde", fifaCode: "CPV", isoCode: "cv", group: "H" },
  KSA: { name: "Arabia Saudita", fifaCode: "KSA", isoCode: "sa", group: "H" },
  URU: { name: "Uruguay", fifaCode: "URU", isoCode: "uy", group: "H" },

  // ───── Grupo I
  FRA: { name: "Francia", fifaCode: "FRA", isoCode: "fr", group: "I" },
  SEN: { name: "Senegal", fifaCode: "SEN", isoCode: "sn", group: "I" },
  IRQ: { name: "Irak", fifaCode: "IRQ", isoCode: "iq", group: "I" },
  NOR: { name: "Noruega", fifaCode: "NOR", isoCode: "no", group: "I" },

  // ───── Grupo J
  ARG: { name: "Argentina", fifaCode: "ARG", isoCode: "ar", group: "J" },
  ALG: { name: "Argelia", fifaCode: "ALG", isoCode: "dz", group: "J" },
  AUT: { name: "Austria", fifaCode: "AUT", isoCode: "at", group: "J" },
  JOR: { name: "Jordania", fifaCode: "JOR", isoCode: "jo", group: "J" },

  // ───── Grupo K
  POR: { name: "Portugal", fifaCode: "POR", isoCode: "pt", group: "K" },
  COD: { name: "RD del Congo", fifaCode: "COD", isoCode: "cd", group: "K" },
  UZB: { name: "Uzbekistán", fifaCode: "UZB", isoCode: "uz", group: "K" },
  COL: { name: "Colombia", fifaCode: "COL", isoCode: "co", group: "K" },

  // ───── Grupo L
  ENG: { name: "Inglaterra", fifaCode: "ENG", isoCode: "gb-eng", group: "L" },
  CRO: { name: "Croacia", fifaCode: "CRO", isoCode: "hr", group: "L" },
  GHA: { name: "Ghana", fifaCode: "GHA", isoCode: "gh", group: "L" },
  PAN: { name: "Panamá", fifaCode: "PAN", isoCode: "pa", group: "L" },
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

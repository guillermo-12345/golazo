// Mapping FIFA 3-letter code -> ISO 3166-1 alpha-2 (para flagcdn.com)
// 48 selecciones clasificadas al Mundial 2026, según el sorteo oficial.

// Confederación FIFA a la que pertenece la selección.
// Dato estable de gobernanza/geografía futbolística — no cambia.
export type Confederation = "UEFA" | "CONMEBOL" | "CONCACAF" | "CAF" | "AFC" | "OFC"

export type TeamInfo = {
  name: string
  fifaCode: string
  isoCode: string
  group?: string
  /** Confederación FIFA (dato verificado y estable). */
  confederation: Confederation
  /** true solo para los 3 anfitriones del Mundial 2026 (USA, Canadá, México). */
  host?: boolean
}

export const CONFEDERATION_LABELS: Record<Confederation, string> = {
  UEFA: "UEFA (Europa)",
  CONMEBOL: "CONMEBOL (Sudamérica)",
  CONCACAF: "CONCACAF (Norte, Centroamérica y Caribe)",
  CAF: "CAF (África)",
  AFC: "AFC (Asia)",
  OFC: "OFC (Oceanía)",
}

export const TEAMS: Record<string, TeamInfo> = {
  // ───── Grupo A
  MEX: { name: "México", fifaCode: "MEX", isoCode: "mx", group: "A", confederation: "CONCACAF", host: true },
  RSA: { name: "Sudáfrica", fifaCode: "RSA", isoCode: "za", group: "A", confederation: "CAF" },
  KOR: { name: "Corea del Sur", fifaCode: "KOR", isoCode: "kr", group: "A", confederation: "AFC" },
  CZE: { name: "República Checa", fifaCode: "CZE", isoCode: "cz", group: "A", confederation: "UEFA" },

  // ───── Grupo B
  CAN: { name: "Canadá", fifaCode: "CAN", isoCode: "ca", group: "B", confederation: "CONCACAF", host: true },
  BIH: { name: "Bosnia y Herzegovina", fifaCode: "BIH", isoCode: "ba", group: "B", confederation: "UEFA" },
  QAT: { name: "Qatar", fifaCode: "QAT", isoCode: "qa", group: "B", confederation: "AFC" },
  SUI: { name: "Suiza", fifaCode: "SUI", isoCode: "ch", group: "B", confederation: "UEFA" },

  // ───── Grupo C
  BRA: { name: "Brasil", fifaCode: "BRA", isoCode: "br", group: "C", confederation: "CONMEBOL" },
  MAR: { name: "Marruecos", fifaCode: "MAR", isoCode: "ma", group: "C", confederation: "CAF" },
  HAI: { name: "Haití", fifaCode: "HAI", isoCode: "ht", group: "C", confederation: "CONCACAF" },
  SCO: { name: "Escocia", fifaCode: "SCO", isoCode: "gb-sct", group: "C", confederation: "UEFA" },

  // ───── Grupo D
  USA: { name: "Estados Unidos", fifaCode: "USA", isoCode: "us", group: "D", confederation: "CONCACAF", host: true },
  PAR: { name: "Paraguay", fifaCode: "PAR", isoCode: "py", group: "D", confederation: "CONMEBOL" },
  AUS: { name: "Australia", fifaCode: "AUS", isoCode: "au", group: "D", confederation: "AFC" },
  TUR: { name: "Turquía", fifaCode: "TUR", isoCode: "tr", group: "D", confederation: "UEFA" },

  // ───── Grupo E
  GER: { name: "Alemania", fifaCode: "GER", isoCode: "de", group: "E", confederation: "UEFA" },
  CUW: { name: "Curazao", fifaCode: "CUW", isoCode: "cw", group: "E", confederation: "CONCACAF" },
  CIV: { name: "Costa de Marfil", fifaCode: "CIV", isoCode: "ci", group: "E", confederation: "CAF" },
  ECU: { name: "Ecuador", fifaCode: "ECU", isoCode: "ec", group: "E", confederation: "CONMEBOL" },

  // ───── Grupo F
  NED: { name: "Países Bajos", fifaCode: "NED", isoCode: "nl", group: "F", confederation: "UEFA" },
  JPN: { name: "Japón", fifaCode: "JPN", isoCode: "jp", group: "F", confederation: "AFC" },
  SWE: { name: "Suecia", fifaCode: "SWE", isoCode: "se", group: "F", confederation: "UEFA" },
  TUN: { name: "Túnez", fifaCode: "TUN", isoCode: "tn", group: "F", confederation: "CAF" },

  // ───── Grupo G
  BEL: { name: "Bélgica", fifaCode: "BEL", isoCode: "be", group: "G", confederation: "UEFA" },
  EGY: { name: "Egipto", fifaCode: "EGY", isoCode: "eg", group: "G", confederation: "CAF" },
  IRN: { name: "Irán", fifaCode: "IRN", isoCode: "ir", group: "G", confederation: "AFC" },
  NZL: { name: "Nueva Zelanda", fifaCode: "NZL", isoCode: "nz", group: "G", confederation: "OFC" },

  // ───── Grupo H
  ESP: { name: "España", fifaCode: "ESP", isoCode: "es", group: "H", confederation: "UEFA" },
  CPV: { name: "Cabo Verde", fifaCode: "CPV", isoCode: "cv", group: "H", confederation: "CAF" },
  KSA: { name: "Arabia Saudita", fifaCode: "KSA", isoCode: "sa", group: "H", confederation: "AFC" },
  URU: { name: "Uruguay", fifaCode: "URU", isoCode: "uy", group: "H", confederation: "CONMEBOL" },

  // ───── Grupo I
  FRA: { name: "Francia", fifaCode: "FRA", isoCode: "fr", group: "I", confederation: "UEFA" },
  SEN: { name: "Senegal", fifaCode: "SEN", isoCode: "sn", group: "I", confederation: "CAF" },
  IRQ: { name: "Irak", fifaCode: "IRQ", isoCode: "iq", group: "I", confederation: "AFC" },
  NOR: { name: "Noruega", fifaCode: "NOR", isoCode: "no", group: "I", confederation: "UEFA" },

  // ───── Grupo J
  ARG: { name: "Argentina", fifaCode: "ARG", isoCode: "ar", group: "J", confederation: "CONMEBOL" },
  ALG: { name: "Argelia", fifaCode: "ALG", isoCode: "dz", group: "J", confederation: "CAF" },
  AUT: { name: "Austria", fifaCode: "AUT", isoCode: "at", group: "J", confederation: "UEFA" },
  JOR: { name: "Jordania", fifaCode: "JOR", isoCode: "jo", group: "J", confederation: "AFC" },

  // ───── Grupo K
  POR: { name: "Portugal", fifaCode: "POR", isoCode: "pt", group: "K", confederation: "UEFA" },
  COD: { name: "RD del Congo", fifaCode: "COD", isoCode: "cd", group: "K", confederation: "CAF" },
  UZB: { name: "Uzbekistán", fifaCode: "UZB", isoCode: "uz", group: "K", confederation: "AFC" },
  COL: { name: "Colombia", fifaCode: "COL", isoCode: "co", group: "K", confederation: "CONMEBOL" },

  // ───── Grupo L
  ENG: { name: "Inglaterra", fifaCode: "ENG", isoCode: "gb-eng", group: "L", confederation: "UEFA" },
  CRO: { name: "Croacia", fifaCode: "CRO", isoCode: "hr", group: "L", confederation: "UEFA" },
  GHA: { name: "Ghana", fifaCode: "GHA", isoCode: "gh", group: "L", confederation: "CAF" },
  PAN: { name: "Panamá", fifaCode: "PAN", isoCode: "pa", group: "L", confederation: "CONCACAF" },
}

/**
 * Resumen verificable de cómo la selección llegó al Mundial 2026, a nivel
 * confederación (dato estable). NO afirma posiciones de grupo ni resultados
 * puntuales — eso solo se muestra con datos reales sincronizados de API-Football.
 */
export function getQualificationSummary(code: string): string | null {
  const team = getTeamByCode(code)
  if (!team) return null
  if (team.host) {
    return "Clasificado automáticamente como país anfitrión del Mundial 2026."
  }
  return `Clasificó representando a la ${CONFEDERATION_LABELS[team.confederation]} en las Eliminatorias al Mundial 2026.`
}

/** Code FIFA -> nombre en inglés que usa API-Football (para matchear partidos de eliminatorias). */
export const API_FOOTBALL_NAME_TO_CODE: Record<string, string> = {
  Mexico: "MEX",
  "South Africa": "RSA",
  "South Korea": "KOR",
  "Korea Republic": "KOR",
  "Czech Republic": "CZE",
  Czechia: "CZE",
  Canada: "CAN",
  "Bosnia and Herzegovina": "BIH",
  Qatar: "QAT",
  Switzerland: "SUI",
  Brazil: "BRA",
  Morocco: "MAR",
  Haiti: "HAI",
  Scotland: "SCO",
  "USA": "USA",
  "United States": "USA",
  Paraguay: "PAR",
  Australia: "AUS",
  "Turkey": "TUR",
  "Türkiye": "TUR",
  Germany: "GER",
  "Curacao": "CUW",
  "Curaçao": "CUW",
  "Ivory Coast": "CIV",
  "Cote d'Ivoire": "CIV",
  Ecuador: "ECU",
  Netherlands: "NED",
  Japan: "JPN",
  Sweden: "SWE",
  Tunisia: "TUN",
  Belgium: "BEL",
  Egypt: "EGY",
  Iran: "IRN",
  "IR Iran": "IRN",
  "New Zealand": "NZL",
  Spain: "ESP",
  "Cape Verde": "CPV",
  "Cabo Verde": "CPV",
  "Saudi Arabia": "KSA",
  Uruguay: "URU",
  France: "FRA",
  Senegal: "SEN",
  Iraq: "IRQ",
  Norway: "NOR",
  Argentina: "ARG",
  Algeria: "ALG",
  Austria: "AUT",
  Jordan: "JOR",
  Portugal: "POR",
  "DR Congo": "COD",
  "Congo DR": "COD",
  "Democratic Republic of Congo": "COD",
  Uzbekistan: "UZB",
  Colombia: "COL",
  England: "ENG",
  Croatia: "CRO",
  Ghana: "GHA",
  Panama: "PAN",
}

/** Resuelve el nombre que devuelve API-Football al code FIFA interno (o null si no es un país del Mundial). */
export function resolveApiTeamCode(apiName: string): string | null {
  return API_FOOTBALL_NAME_TO_CODE[apiName.trim()] ?? null
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

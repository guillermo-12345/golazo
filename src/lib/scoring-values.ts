/**
 * Valores de puntaje que muestra la UI.
 *
 * Rebalanceados por probabilidad: cada apuesta paga ~proporcional a su
 * dificultad, así no conviene llenar solo las fáciles. La fuente de verdad
 * del CÁLCULO es SQL (supabase/migrations/011_scoring_rebalance.sql) —
 * si cambiás un valor acá, cambialo también allá.
 */

/** Puntos básicos por defecto (config.multipliers de cada liga puede pisarlos). */
export const BASIC_POINTS = {
  exactScore: 5,
  winnerWithDiff: 4,
  correctDraw: 3,
  correctWinner: 1,
} as const

/** Puntos de las predicciones avanzadas (hardcodeados en SQL, no por liga). */
export const ADVANCED_POINTS = {
  /** Primer goleador del partido (~12%) */
  firstScorer: 6,
  /** Minuto del primer gol, 6 rangos (~15%) */
  goalMinute: 5,
  /** Resultado exacto al descanso (~15-20%) */
  halftimeResult: 4,
  /** Total de amarillas por rango (~25-30%) */
  yellowCards: 3,
  /** Total de córners por rango (~25-30%) */
  corners: 3,
  /** Total de tiros por rango (~25-30%) */
  totalShots: 3,
  /** Total de faltas por rango (~25-30%) */
  totalFouls: 3,
  /** Primer equipo en marcar (~45%) */
  firstTeamToScore: 2,
  /** Hubo roja: SÍ (~25%) */
  redCardYes: 4,
  /** Hubo roja: NO (~75%) */
  redCardNo: 1,
  /** Equipo con más posesión (~48%) */
  possession: 1,
} as const

/** Desafío diario por niveles (SQL: migración 017 — mantener en sync). */
export const DAILY_CHALLENGE_POINTS = {
  /** Predecir todos los partidos del día */
  participate: 1,
  /** Acertar el 1X2 en al menos la mitad de los partidos del día */
  accuracy: 2,
  /** Clavar al menos un resultado exacto en el día */
  sniper: 3,
} as const

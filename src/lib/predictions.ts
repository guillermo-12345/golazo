/**
 * Regla de cierre de predicciones.
 *
 * Las predicciones cierran un rato ANTES del kickoff para evitar trampas:
 * ~60-75 min antes se publican las alineaciones oficiales, y conocerlas
 * da ventaja injusta. El corte vive también en la base de datos (RLS,
 * migración 010) — si cambiás este valor, cambialo en ambos lados.
 */
export const PREDICTION_LOCK_MINUTES = 65

/** Momento exacto en que cierran las predicciones de un partido. */
export function predictionLockTime(scheduledAt: string | Date): Date {
  const kickoff = typeof scheduledAt === "string" ? new Date(scheduledAt) : scheduledAt
  return new Date(kickoff.getTime() - PREDICTION_LOCK_MINUTES * 60 * 1000)
}

/** true si ya no se puede predecir este partido. */
export function isPredictionLocked(scheduledAt: string | Date, status: string): boolean {
  return status !== "scheduled" || predictionLockTime(scheduledAt) <= new Date()
}

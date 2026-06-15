/**
 * Regla de cierre de predicciones.
 *
 * Las predicciones cierran 5 minutos ANTES del kickoff: se puede predecir
 * hasta casi el inicio, pero no con el partido ya empezado. El corte vive
 * también en la base de datos (RLS, migración 015) — si cambiás este valor,
 * actualizá también prediction_window_open en una migración nueva.
 */
export const PREDICTION_LOCK_MINUTES = 5

/** Momento exacto en que cierran las predicciones de un partido. */
export function predictionLockTime(scheduledAt: string | Date): Date {
  const kickoff = typeof scheduledAt === "string" ? new Date(scheduledAt) : scheduledAt
  return new Date(kickoff.getTime() - PREDICTION_LOCK_MINUTES * 60 * 1000)
}

/** true si ya no se puede predecir este partido. */
export function isPredictionLocked(scheduledAt: string | Date, status: string): boolean {
  return status !== "scheduled" || predictionLockTime(scheduledAt) <= new Date()
}

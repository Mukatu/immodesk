/**
 * Ancienneté d'une déclaration de paiement (Mobile Money ou virement) non
 * traitée. Seuil d'alerte du contrat phase 4 : 72 heures (§ Virement déclaré,
 * « Alerte »). Réutilisé pour Mobile Money par cohérence, à défaut d'un champ
 * `ageHours` dédié côté contrat pour ce canal (calcul depuis `initiatedAt`).
 */
export const AGE_ALERT_THRESHOLD_HOURS = 72;

/** Nombre d'heures écoulées depuis une date ISO donnée. */
export function hoursSince(isoDate: string): number {
  const elapsedMs = Date.now() - new Date(isoDate).getTime();
  return elapsedMs / (3600 * 1000);
}

/** Formate une ancienneté en heures en texte fr-CG court (« 3 h », « 96 h »). */
export function formatAgeHours(hours: number): string {
  return `${Math.max(0, Math.round(hours))} h`;
}

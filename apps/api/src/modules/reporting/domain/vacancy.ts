/**
 * Durée moyenne de vacance des lots (contrat phase 9, § « Tableaux de
 * bord »). Domaine pur, sans date du jour implicite : chaque durée est
 * calculée par l'appelant à partir de `asOf` et de la fin du dernier bail,
 * puis moyennée ici.
 */

/**
 * Moyenne, en jours entiers, d'une liste de durées de vacance.
 *
 * Un lot jamais loué n'a pas de « fin de dernier bail » : il est exclu de la
 * liste par l'appelant plutôt que compté comme une durée nulle, ce qui
 * biaiserait la moyenne à la baisse pour un portefeuille neuf. Une liste vide
 * (aucun lot vacant avec historique de bail) renvoie 0.
 */
export function averageVacancyDays(vacancyDurationsDays: number[]): number {
  if (vacancyDurationsDays.length === 0) return 0;
  const total = vacancyDurationsDays.reduce((sum, days) => sum + Math.max(0, days), 0);
  return Math.round(total / vacancyDurationsDays.length);
}

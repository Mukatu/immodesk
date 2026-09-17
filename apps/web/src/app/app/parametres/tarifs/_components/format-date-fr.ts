/**
 * Formatage de date fr-CG local (JJ/MM/AAAA), sans dépendre de la locale de
 * l'environnement (`toLocaleDateString('fr-CG')` n'est pas garanti disponible
 * en Node de test) — même convention que `rent-revision-timeline.tsx`.
 */
function formatDateFr(iso: string): string {
  const date = new Date(iso);
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

/** Période de validité d'un tarif : bornée ou ouverte (pas de date de fin). */
export function formatValidityPeriod(effectiveFrom: string, effectiveTo?: string | null): string {
  if (effectiveTo) {
    return `Du ${formatDateFr(effectiveFrom)} au ${formatDateFr(effectiveTo)}`;
  }
  return `Depuis le ${formatDateFr(effectiveFrom)}`;
}

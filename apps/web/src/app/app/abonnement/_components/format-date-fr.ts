/**
 * Formatage de date fr-CG local (JJ/MM/AAAA), sans dépendre de la locale de
 * l'environnement — même convention que
 * `app/parametres/tarifs/_components/format-date-fr.ts`.
 */
export function formatDateFr(iso: string): string {
  const date = new Date(iso);
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

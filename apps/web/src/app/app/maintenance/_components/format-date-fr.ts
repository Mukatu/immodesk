/**
 * Formatage de date fr-CG local, sans dépendre de la locale de l'environnement
 * (toLocaleDateString('fr-CG') n'est pas garanti disponible en Node de test) —
 * même convention que rent-revision-timeline.tsx et baux/[id]/_components/format-date-fr.ts.
 */
export function formatDateFr(iso: string): string {
  const date = new Date(iso);
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

/** Date + heure fr-CG (JJ/MM/AAAA HH:MM), pour le fil chronologique des mises à jour. */
export function formatDateTimeFr(iso: string): string {
  const date = new Date(iso);
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${formatDateFr(iso)} ${h}:${min}`;
}

/**
 * Formatage de date fr-CG local, sans dépendre de la locale de l'environnement
 * — même convention que maintenance/_components/format-date-fr.ts.
 */
export function formatDateFr(iso: string): string {
  const date = new Date(iso);
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

/** Date + heure fr-CG (JJ/MM/AAAA HH:MM). */
export function formatDateTimeFr(iso: string): string {
  const date = new Date(iso);
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${formatDateFr(iso)} ${h}:${min}`;
}

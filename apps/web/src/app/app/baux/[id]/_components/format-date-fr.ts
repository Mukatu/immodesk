/**
 * Formatage de date fr-CG local (DD/MM/YYYY). On évite toLocaleDateString('fr-CG')
 * qui n'est pas garanti disponible dans l'environnement de test Node — même
 * convention que rent-revision-timeline.tsx.
 */
export function formatDateFr(iso: string): string {
  const date = new Date(iso);
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

/**
 * Jours OUVRÉS écoulés entre deux instants, calcul en UTC
 * (docs/api/phase6-contract.md, § « Alerte quotidienne »). Le dépôt en
 * banque se fait du lundi au samedi ; seul le dimanche est chômé. Le jour de
 * `from` n'est jamais compté (le dépôt a eu lieu ce jour-là), celui de `to`
 * l'est si ce n'est pas un dimanche.
 */
export function businessDaysBetween(from: Date, to: Date): number {
  if (to <= from) return 0;
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
  let count = 0;
  cursor.setUTCDate(cursor.getUTCDate() + 1);
  while (cursor <= end) {
    if (cursor.getUTCDay() !== 0) count += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

import { compareDates, daysInMonth, endOfMonth, startOfMonth } from './calendar';

/**
 * Prorata d'entrée et de sortie, au JOUR CALENDAIRE sur le MOIS RÉEL.
 *
 * Décision de la phase 2 (docs/04_plan_de_phases.md, § 2.2) : la base du
 * calcul est le nombre de jours du mois considéré — 28 ou 29 en février,
 * 30 ou 31 ailleurs. Aucun « mois de 30 jours » conventionnel : un locataire
 * entré le 15 février paie la moitié d'un mois, pas 16/30.
 *
 * Les bornes sont INCLUSES des deux côtés : du 15 au 28 février fait 14
 * jours. C'est la lecture qu'une agence fait d'un contrat, et celle qui
 * donne exactement le loyer plein quand la période couvre le mois entier.
 *
 * Fonction PURE : montants en BigInt XAF, aucune décimale, aucun flottant.
 * Exposée pour la facturation de la phase 3 et verrouillée par des tests
 * unitaires dès la phase 2.
 */
export function prorata(amount: bigint, from: Date, to: Date): bigint {
  if (amount < 0n) {
    throw new RangeError('Le prorata ne se calcule pas sur un montant négatif.');
  }
  if (compareDates(from, to) > 0) return 0n;

  let total = 0n;
  let cursor = startOfMonth(from);
  const last = startOfMonth(to);

  // Une période peut chevaucher plusieurs mois (bail du 20 mai au 10 juin) :
  // chaque mois est proratisé sur SA propre longueur, puis les parts sont
  // additionnées. Proratiser la période entière sur un seul dénominateur
  // fausserait le calcul dès que les mois n'ont pas la même longueur.
  while (compareDates(cursor, last) <= 0) {
    const monthStart = cursor;
    const monthEnd = endOfMonth(cursor);
    const segmentStart = compareDates(from, monthStart) > 0 ? from : monthStart;
    const segmentEnd = compareDates(to, monthEnd) < 0 ? to : monthEnd;

    const covered = segmentEnd.getUTCDate() - segmentStart.getUTCDate() + 1;
    const length = daysInMonth(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1);
    total += shareOfMonth(amount, covered, length);

    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
  }

  return total;
}

/**
 * Part d'un montant mensuel pour `covered` jours sur `length`.
 *
 * Arrondi au franc le plus proche, les demis vers le haut : le XAF n'a pas
 * de sous-unité, il faut donc trancher. Tronquer systématiquement ferait
 * perdre jusqu'à un franc par ligne au bailleur ; arrondir au plus proche
 * répartit l'écart et reste ce qu'une agence écrit à la main.
 *
 * L'opération se fait entièrement en BigInt : `2·a·c + l` puis division par
 * `2·l`. Aucun passage par un flottant, donc aucune erreur de représentation.
 */
export function shareOfMonth(amount: bigint, covered: number, length: number): bigint {
  if (length <= 0) throw new RangeError('Un mois ne peut pas avoir zéro jour.');
  const days = BigInt(Math.max(covered, 0));
  const total = BigInt(length);
  if (days >= total) return amount;
  return (2n * amount * days + total) / (2n * total);
}

/**
 * Prorata d'ENTRÉE : de la date d'emménagement à la fin de son mois.
 * Entrer le 1er donne le loyer plein.
 */
export function entryProrata(amount: bigint, moveInDate: Date): bigint {
  return prorata(amount, moveInDate, endOfMonth(moveInDate));
}

/**
 * Prorata de SORTIE : du 1er du mois à la date de départ incluse.
 * Partir le dernier jour du mois donne le loyer plein.
 */
export function exitProrata(amount: bigint, moveOutDate: Date): bigint {
  return prorata(amount, startOfMonth(moveOutDate), moveOutDate);
}

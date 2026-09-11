import { compareDates } from './calendar';

/** Révision de loyer, réduite à ce dont le calcul a besoin. */
export interface RentRevisionPoint {
  id: string;
  effectiveDate: Date;
  newRentAmount: bigint;
  newChargesAmount: bigint;
}

/** Conditions financières initiales du bail. */
export interface InitialRent {
  rentAmount: bigint;
  chargesAmount: bigint;
}

export interface RentAtDate {
  rentAmount: bigint;
  chargesAmount: bigint;
  source: 'INITIAL' | 'REVISION';
  revisionId: string | null;
}

/**
 * Loyer applicable à une date : la DERNIÈRE révision dont la date d'effet est
 * antérieure ou égale à la date demandée, sinon les conditions initiales.
 *
 * POURQUOI NE PAS LIRE `leases.rent_amount` — cette colonne porte le loyer
 * COURANT, mis à jour quand une révision prend effet. Facturer une période
 * passée avec elle réécrirait l'histoire : une régularisation de charges
 * émise en mars pour janvier doit retenir le loyer de janvier. L'historique
 * daté est donc la seule source admissible, et `rent_amount` n'est qu'un
 * cache de la valeur du jour.
 *
 * Fonction PURE. Les révisions peuvent arriver dans n'importe quel ordre :
 * elles sont triées ici, le classement n'étant pas à la charge de l'appelant.
 */
export function rentAt(
  initial: InitialRent,
  revisions: readonly RentRevisionPoint[],
  date: Date,
): RentAtDate {
  const applicable = [...revisions]
    .filter((revision) => compareDates(revision.effectiveDate, date) <= 0)
    .sort((a, b) => compareDates(a.effectiveDate, b.effectiveDate));

  const last = applicable.at(-1);
  if (!last) {
    return {
      rentAmount: initial.rentAmount,
      chargesAmount: initial.chargesAmount,
      source: 'INITIAL',
      revisionId: null,
    };
  }
  return {
    rentAmount: last.newRentAmount,
    chargesAmount: last.newChargesAmount,
    source: 'REVISION',
    revisionId: last.id,
  };
}

/**
 * Révisions déjà prises d'effet à la date du jour : celles que le bail doit
 * refléter dans `rent_amount` / `charges_amount`. Sert au cron quotidien.
 */
export function effectiveRevisions(
  revisions: readonly RentRevisionPoint[],
  today: Date,
): RentRevisionPoint[] {
  return [...revisions]
    .filter((revision) => compareDates(revision.effectiveDate, today) <= 0)
    .sort((a, b) => compareDates(a.effectiveDate, b.effectiveDate));
}

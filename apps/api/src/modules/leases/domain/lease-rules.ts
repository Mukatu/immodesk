import { DomainError } from '../../../shared/errors/domain-error';
import { addDays, compareDates, startOfMonth, startOfDay } from './calendar';

/** Délai légal de restitution du dépôt après la date d'effet de la sortie. */
export const DEPOSIT_REFUND_DELAY_DAYS = 30;

/** Antériorité maximale admise pour une date d'effet de préavis ou de résiliation. */
export const MAX_BACKDATED_EFFECT_DAYS = 30;

/** Statuts de lot acceptant l'activation d'un bail (DDL `unit_status`). */
export const ACTIVATABLE_UNIT_STATUSES = ['AVAILABLE', 'RESERVED'] as const;

/**
 * Champs qui restent modifiables APRÈS activation.
 *
 * Tout le reste — loyer, charges, dépôt, lot, locataire, dates d'effet —
 * est figé par la signature : le modifier réécrirait un contrat déjà remis
 * au locataire. Le loyer se change par une révision datée, la durée par une
 * prolongation d'`endDate`, et rien d'autre.
 */
export const POST_ACTIVATION_EDITABLE_FIELDS = [
  'notes',
  'collectorUserId',
  'preferredPaymentMethod',
  'noticeDays',
  'autoRenew',
  'endDate',
] as const;

export type PostActivationEditableField = (typeof POST_ACTIVATION_EDITABLE_FIELDS)[number];

/**
 * Nombre de mois de loyer que représente le dépôt, arrondi à l'entier le plus
 * proche. `null` quand le loyer est nul : diviser par zéro n'a pas de sens,
 * et « 0 mois » serait un chiffre faux plutôt qu'une absence d'information.
 */
export function monthsEquivalent(depositAmount: bigint, rentAmount: bigint): number | null {
  if (rentAmount <= 0n) return null;
  return Number((2n * depositAmount + rentAmount) / (2n * rentAmount));
}

/**
 * Vérifie qu'une modification est permise dans l'état courant.
 *
 * En DRAFT et PENDING_SIGNATURE, tout est ouvert. Ensuite, seuls les champs
 * de gestion listés ci-dessus le restent : une tentative sur un autre champ
 * lève `409 LEASES.NOT_EDITABLE` en nommant les champs fautifs, pour que
 * l'interface sache lesquels griser.
 */
export function assertEditable(status: string, requestedFields: readonly string[]): void {
  if (status === 'DRAFT' || status === 'PENDING_SIGNATURE') return;

  const allowed = new Set<string>(POST_ACTIVATION_EDITABLE_FIELDS);
  const rejected = requestedFields.filter((field) => !allowed.has(field));
  if (rejected.length > 0) {
    throw new DomainError('LEASES.NOT_EDITABLE', {
      status,
      rejectedFields: rejected,
      editableFields: [...POST_ACTIVATION_EDITABLE_FIELDS],
    });
  }
}

/**
 * Date d'effet d'un préavis ou d'une résiliation.
 *
 * Le contrat autorise un effet rétroactif de 30 jours au plus : une agence
 * enregistre souvent le départ quelques jours après coup, mais antidater de
 * six mois reviendrait à effacer des loyers déjà appelés.
 */
export function assertEffectiveDateAcceptable(effectiveDate: Date, today: Date): void {
  const floor = addDays(startOfDay(today), -MAX_BACKDATED_EFFECT_DAYS);
  if (compareDates(effectiveDate, floor) < 0) {
    throw new DomainError('LEASES.TERMINATION_DATE_INVALID', {
      effectiveDate: effectiveDate.toISOString().slice(0, 10),
      earliestAccepted: floor.toISOString().slice(0, 10),
    });
  }
}

/**
 * Date d'effet d'une révision de loyer.
 *
 * Trois bornes cumulatives :
 *   * postérieure à la dernière révision — sinon l'historique cesse d'être
 *     une suite ordonnée et « le loyer à la date D » devient ambigu ;
 *   * postérieure ou égale au 1er du mois courant — aucune période déjà
 *     facturée ne peut être réécrite (en phase 2 aucune facture n'existe
 *     encore, la règle est donc posée sur le mois, pas sur les factures) ;
 *   * postérieure ou égale à la date de début du bail.
 */
export function assertRevisionDate(
  effectiveDate: Date,
  startDate: Date,
  lastRevisionDate: Date | null,
  today: Date,
): void {
  const details = {
    effectiveDate: effectiveDate.toISOString().slice(0, 10),
    startDate: startDate.toISOString().slice(0, 10),
    lastRevisionDate: lastRevisionDate ? lastRevisionDate.toISOString().slice(0, 10) : null,
    earliestAccepted: startOfMonth(today).toISOString().slice(0, 10),
  };

  if (lastRevisionDate && compareDates(effectiveDate, lastRevisionDate) <= 0) {
    throw new DomainError('LEASES.REVISION_DATE_INVALID', { ...details, reason: 'AFTER_LAST' });
  }
  if (compareDates(effectiveDate, startOfMonth(today)) < 0) {
    throw new DomainError('LEASES.REVISION_DATE_INVALID', { ...details, reason: 'CURRENT_MONTH' });
  }
  if (compareDates(effectiveDate, startDate) < 0) {
    throw new DomainError('LEASES.REVISION_DATE_INVALID', { ...details, reason: 'BEFORE_START' });
  }
}

/** Date limite de restitution du dépôt : date d'effet + 30 jours. */
export function refundDueDate(effectiveDate: Date): Date {
  return addDays(effectiveDate, DEPOSIT_REFUND_DELAY_DAYS);
}

/**
 * Un lot dont le type est commercial déclenche le bloc OHADA du contrat.
 * La liste vient du DDL (`unit_type`) et du contrat de la phase 2.
 */
export const COMMERCIAL_UNIT_TYPES = ['SHOP', 'OFFICE', 'WAREHOUSE'] as const;

export function isCommercialUnit(unitType: string): boolean {
  return (COMMERCIAL_UNIT_TYPES as readonly string[]).includes(unitType);
}

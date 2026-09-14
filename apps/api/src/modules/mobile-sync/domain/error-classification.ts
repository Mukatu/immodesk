import { DomainError } from '../../../shared/errors/domain-error';
import type { SyncErrorVerdict } from './operation-handler';

/**
 * Codes métier signifiant que l'état du SERVEUR a changé pendant que
 * l'appareil était hors ligne (facture annulée ou soldée entre-temps, bail
 * clôturé, tiers supprimé, transition d'état déjà franchie) : `CONFLICT`,
 * jamais résolu automatiquement (docs/api/phase5-contract.md, arbitrage 2).
 *
 * Tout autre code métier reconnu est un rejet DÉFINITIF (`REJECTED`) : règle
 * violée sans lien avec un changement survenu en ligne pendant la coupure
 * (montant invalide, signature manquante, référence incohérente).
 */
const CONFLICT_CODES = new Set<string>([
  'PAYMENTS.INVOICE_NOT_OPEN',
  'LEASES.INVALID_TRANSITION',
  'LEASES.NOT_EDITABLE',
  'LEASES.NOT_FOUND',
  'BILLING.INVALID_TRANSITION',
  'BILLING.INVOICE_NOT_EDITABLE',
  'CASH.REMITTANCE_INVALID_TRANSITION',
  'PARTIES.TENANT_NOT_FOUND',
  'PORTFOLIO.UNIT_NOT_FOUND',
]);

/**
 * Classification générique par catalogue de codes, partagée par les
 * gestionnaires `CASH_RECEIPT` et `DOCUMENT`. Un gestionnaire de phase 8 peut
 * l'étendre (jamais la remplacer) pour ses propres codes métier.
 */
export function classifyDomainError(error: unknown): SyncErrorVerdict | null {
  if (!(error instanceof DomainError)) return null;
  const outcome = CONFLICT_CODES.has(error.code) ? 'CONFLICT' : 'REJECTED';
  return {
    outcome,
    code: error.code,
    message: error.message,
    // Contrat : faux pour un conflit ou un rejet définitif — les deux issues
    // couvertes ici sont, par construction, l'une ou l'autre.
    retryable: false,
  };
}

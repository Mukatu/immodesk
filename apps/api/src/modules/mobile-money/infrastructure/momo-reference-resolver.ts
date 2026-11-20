import type { PrismaClient } from '../../../generated/prisma/client';
import type { MomoPurpose } from '../domain/momo-purpose';

/**
 * Rattachement d'un webhook Mobile Money à SA transaction, donc à son
 * organisation, à partir de la seule clé connue du fournisseur.
 *
 * `merchant_reference` (`MMA-AAAAMM-NNNNN`) est numérotée PAR organisation :
 * deux organisations peuvent porter la même. La clé fournisseur est donc
 * `external_reference`, unique sur toute la table (migration 9). Les
 * transactions historiques dont la clé était partagée y ont été laissées à
 * NULL : un webhook qui les cite est AMBIGU et n'est jamais rattaché au
 * hasard (échec fermé — aucune confirmation pour une autre organisation).
 *
 * Exécuté avec le rôle d'administration : à la réception, aucune
 * organisation n'est encore connue, donc aucun contexte RLS n'est possible.
 */
export type MomoReferenceResolution =
  | {
      kind: 'RESOLVED';
      organizationId: string;
      transactionId: string;
      purpose: MomoPurpose;
      aggregator: string | null;
    }
  | { kind: 'UNKNOWN' }
  | { kind: 'AMBIGUOUS'; candidates: number };

/** Message porté par l'événement mis de côté, filtrable par la revue plateforme. */
export const MOMO_WEBHOOK_UNRESOLVED = 'MOMO.WEBHOOK_REFERENCE_UNRESOLVED';
export const MOMO_WEBHOOK_AMBIGUOUS = 'MOMO.WEBHOOK_REFERENCE_AMBIGUOUS';
export const MOMO_WEBHOOK_SIGNATURE_INVALID = 'MOMO.WEBHOOK_SIGNATURE_INVALID';
export const MOMO_WEBHOOK_PAYLOAD_INVALID = 'MOMO.WEBHOOK_PAYLOAD_INVALID';
export const MOMO_WEBHOOK_PROVIDER_MISMATCH = 'MOMO.WEBHOOK_PROVIDER_MISMATCH';
export const MOMO_WEBHOOK_PURPOSE_NOT_ROUTED = 'MOMO.WEBHOOK_PURPOSE_NOT_ROUTED';

export async function resolveMomoExternalReference(
  admin: PrismaClient,
  reference: string,
): Promise<MomoReferenceResolution> {
  // Clé unique (`momo_external_ref_uk`) : au plus une ligne, seul cas de rattachement.
  const exact = await admin.$queryRawUnsafe<
    Array<{ id: string; organization_id: string; purpose: MomoPurpose; aggregator: string | null }>
  >(
    `SELECT id, organization_id, purpose, aggregator
       FROM mobile_money_transactions WHERE external_reference = $1`,
    reference,
  );
  const row = exact[0];
  if (exact.length === 1 && row) {
    return {
      kind: 'RESOLVED',
      organizationId: row.organization_id,
      transactionId: row.id,
      purpose: row.purpose,
      aggregator: row.aggregator,
    };
  }
  if (exact.length > 1) return { kind: 'AMBIGUOUS', candidates: exact.length };

  // Repli de diagnostic seulement : une transaction historique écartée par la
  // migration pour collision n'est jamais retenue, même seule — on distingue
  // simplement « ambigu » (à revoir) de « inconnu ».
  const legacy = await admin.$queryRawUnsafe<Array<{ n: number }>>(
    `SELECT count(*)::int AS n
       FROM mobile_money_transactions
      WHERE external_reference IS NULL AND channel = 'AGGREGATOR'
        AND coalesce(aggregator_transaction_id, merchant_reference) = $1`,
    reference,
  );
  const candidates = legacy[0]?.n ?? 0;
  return candidates > 0 ? { kind: 'AMBIGUOUS', candidates } : { kind: 'UNKNOWN' };
}

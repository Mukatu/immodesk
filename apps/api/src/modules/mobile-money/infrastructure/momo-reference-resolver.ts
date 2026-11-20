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
export const MOMO_WEBHOOK_ENQUEUE_FAILED = 'MOMO.WEBHOOK_ENQUEUE_FAILED';
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

export interface OpenPayTriggerTarget {
  organizationId: string;
  transactionId: string;
  purpose: MomoPurpose;
  /** Référence du callback à proposer à `getStatus` quand la nôtre n'est pas encore stockée. */
  providerReferenceHint?: string;
}

/**
 * Retrouve la transaction visée par un callback OpenPay NON signé. Le résultat
 * ne prouve rien (il ne sert qu'à choisir quoi re-interroger) : l'organisation
 * n'est attribuée à l'événement qu'après une réponse conforme du fournisseur.
 * Collecte : référence OpenPay (`PTXN...`), sinon l'indice
 * `metadata.external_reference` pour une transaction encore sans référence.
 * Retrait : l'UUID est notre `external_reference`.
 */
export async function resolveOpenPayTrigger(
  admin: PrismaClient,
  trigger: {
    reference: string;
    type: 'payment' | 'scheduled_cashout';
    externalReferenceHint?: string;
  },
): Promise<OpenPayTriggerTarget | null> {
  type Row = { id: string; organization_id: string; purpose: MomoPurpose };
  const toTarget = (row: Row | undefined, hint?: string): OpenPayTriggerTarget | null =>
    row
      ? {
          organizationId: row.organization_id,
          transactionId: row.id,
          purpose: row.purpose,
          ...(hint ? { providerReferenceHint: hint } : {}),
        }
      : null;
  if (trigger.type === 'scheduled_cashout') {
    const rows = await admin.$queryRawUnsafe<Row[]>(
      `SELECT id, organization_id, purpose FROM mobile_money_transactions
        WHERE aggregator = 'OPENPAY' AND purpose = 'OWNER_PAYOUT' AND external_reference = $1`,
      trigger.reference,
    );
    return toTarget(rows[0]);
  }
  const byReference = await admin.$queryRawUnsafe<Row[]>(
    `SELECT id, organization_id, purpose FROM mobile_money_transactions
      WHERE aggregator = 'OPENPAY' AND purpose <> 'OWNER_PAYOUT' AND aggregator_transaction_id = $1`,
    trigger.reference,
  );
  if (byReference[0]) return toTarget(byReference[0]);
  if (!trigger.externalReferenceHint) return null;
  const byHint = await admin.$queryRawUnsafe<Row[]>(
    `SELECT id, organization_id, purpose FROM mobile_money_transactions
      WHERE aggregator = 'OPENPAY' AND purpose <> 'OWNER_PAYOUT' AND external_reference = $1
        AND aggregator_transaction_id IS NULL AND status = 'INITIATED'`,
    trigger.externalReferenceHint,
  );
  return toTarget(byHint[0], trigger.reference);
}

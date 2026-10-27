import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import type { TenantClient } from '../../../shared/prisma/prisma.service';
import type { ContactOwnerType } from '../../parties/domain/party-rules';
import { buildAnonymizationPatch, type ReservedValues } from '../domain/erasure-rules';
import { partyTableFor, type PartyAnonymizationRow, type SubjectType } from '../domain/subject';
import { collectKnownAddresses, ErasureSideEffectsService } from './erasure-side-effects.service';
import type { AnonymizedCount, PreservedCount, TableCount } from './erasure-execution.service';

export interface ErasureCounts {
  anonymized: AnonymizedCount[];
  deleted: TableCount[];
  preserved: PreservedCount[];
}

const OWNER_TYPE: Record<Exclude<SubjectType, 'user'>, ContactOwnerType> = {
  tenant: 'TENANT',
  landlord: 'LANDLORD',
  guarantor: 'GUARANTOR',
};

const NEVER_TOUCHED_TABLES = [
  'payments',
  'payment_allocations',
  'cash_receipts',
  'receipts',
  'rent_invoices',
  'invoice_lines',
  'deposits',
  'deposit_movements',
  'audit_logs',
] as const;

/**
 * Simule EXACTEMENT ce que `ErasureExecutionService.execute` écrirait, mais en
 * COMPTANT plutôt qu'en modifiant : `POST /v1/privacy/erasure-requests/preview`
 * n'écrit rien (contrat § Effacement, même discipline que `dryRun` en phase 9).
 * Les deux services partagent la même règle de construction du correctif
 * (`buildAnonymizationPatch`) pour ne jamais diverger sur CE qui serait touché.
 */
@Injectable()
export class ErasurePreviewService {
  constructor(private readonly sideEffects: ErasureSideEffectsService) {}

  async count(
    tx: TenantClient,
    subjectType: Exclude<SubjectType, 'user'>,
    subjectId: string,
    reserved: ReservedValues,
  ): Promise<ErasureCounts> {
    const table = partyTableFor(subjectType);
    if (!table) throw new DomainError('PRIVACY.SUBJECT_TYPE_INVALID', { subjectType });

    const before = (await (
      tx as never as Record<string, { findFirst: (a: unknown) => Promise<unknown> }>
    )[table].findFirst({ where: { id: subjectId } })) as
      (PartyAnonymizationRow & Record<string, unknown>) | null;
    if (!before) throw new DomainError('PRIVACY.SUBJECT_NOT_FOUND', { subjectType, subjectId });

    const patchResult = buildAnonymizationPatch(table, before, reserved);
    const knownAddresses = collectKnownAddresses(before);

    const [channelsCount, idDocsCount, bankAccountsCount, notificationsCount, messagesCount] =
      await Promise.all([
        tx.contact_channels.count({
          where: { owner_type: OWNER_TYPE[subjectType], owner_id: subjectId },
        }),
        tx.documents.count({
          where: {
            related_entity_type: subjectType,
            related_entity_id: subjectId,
            kind: 'ID_DOCUMENT',
            deleted_at: null,
          },
        }),
        subjectType === 'guarantor'
          ? Promise.resolve(0)
          : tx.bank_accounts.count({
              where:
                subjectType === 'tenant'
                  ? { tenant_id: subjectId, is_active: true }
                  : { landlord_id: subjectId, is_active: true },
            }),
        subjectType === 'guarantor'
          ? Promise.resolve(0)
          : tx.notifications.count({
              where: {
                ...(subjectType === 'tenant'
                  ? { recipient_tenant_id: subjectId }
                  : { recipient_landlord_id: subjectId }),
                NOT: { recipient_address: reserved.phone },
              },
            }),
        knownAddresses.length === 0
          ? Promise.resolve(0)
          : tx.message_logs.count({
              where: { to_address: { in: knownAddresses }, NOT: { to_address: reserved.phone } },
            }),
      ]);

    const anonymized: AnonymizedCount[] = [
      { table, rows: patchResult.alreadyAnonymized ? 0 : 1, fields: patchResult.fields },
    ];
    if (notificationsCount > 0) {
      anonymized.push({
        table: 'notifications',
        rows: notificationsCount,
        fields: ['recipientAddress', 'body', 'payload'],
      });
    }
    if (messagesCount > 0) {
      anonymized.push({
        table: 'message_logs',
        rows: messagesCount,
        fields: ['toAddress', 'contentPreview', 'rawPayload'],
      });
    }

    const preserved: PreservedCount[] = [
      {
        table: 'documents',
        rows: idDocsCount,
        reason: 'ID_DOCUMENT : objet serait purgé du stockage, ligne conservée',
      },
    ];
    if (subjectType !== 'guarantor') {
      preserved.push({
        table: 'bank_accounts',
        rows: bankAccountsCount,
        reason: 'Serait désactivé (is_active = false), non supprimé',
      });
    }
    for (const financialTable of NEVER_TOUCHED_TABLES) {
      preserved.push({
        table: financialTable,
        rows: await this.sideEffects.countReferencing(tx, financialTable, subjectType, subjectId),
        reason: 'Jamais touché : écriture financière append-only ou journal immuable (arbitrage 7)',
      });
    }

    return { anonymized, deleted: [{ table: 'contact_channels', rows: channelsCount }], preserved };
  }
}

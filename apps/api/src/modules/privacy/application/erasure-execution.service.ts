import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import type { TenantClient } from '../../../shared/prisma/prisma.service';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import {
  buildAnonymizationPatch,
  type AnonymizationResult,
  type ReservedValues,
} from '../domain/erasure-rules';
import { partyTableFor, type PartyAnonymizationRow, type SubjectType } from '../domain/subject';
import { collectKnownAddresses, ErasureSideEffectsService } from './erasure-side-effects.service';

export interface TableCount {
  table: string;
  rows: number;
}
export interface AnonymizedCount extends TableCount {
  fields: string[];
}
export interface PreservedCount extends TableCount {
  reason: string;
}

export interface ErasureExecutionResult {
  alreadyAnonymized: boolean;
  anonymized: AnonymizedCount[];
  deleted: TableCount[];
  preserved: PreservedCount[];
}

/** Jamais touchées par un effacement (arbitrage 7 et tableau, ligne 119) : écriture financière append-only. */
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
 * Exécute l'anonymisation d'un tiers, table par table, dans la transaction
 * ouverte par l'appelant (`ErasureService`, sous `withTenant`). Idempotent :
 * un tiers déjà anonymisé n'est jamais réécrit (contrat § Effacement).
 */
@Injectable()
export class ErasureExecutionService {
  constructor(
    private readonly auditService: AuditService,
    private readonly sideEffects: ErasureSideEffectsService,
  ) {}

  async execute(
    tx: TenantClient,
    subjectType: Exclude<SubjectType, 'user'>,
    subjectId: string,
    reserved: ReservedValues,
  ): Promise<ErasureExecutionResult> {
    const table = partyTableFor(subjectType);
    if (!table) throw new DomainError('PRIVACY.SUBJECT_TYPE_INVALID', { subjectType });

    const before = await this.loadParty(tx, table, subjectId);
    if (!before) throw new DomainError('PRIVACY.SUBJECT_NOT_FOUND', { subjectType, subjectId });

    const result = buildAnonymizationPatch(table, before, reserved);
    const knownAddresses = collectKnownAddresses(before);

    if (!result.alreadyAnonymized) {
      await this.applyPartyPatch(tx, table, subjectId, result);
      await audit(this.auditService, tx, {
        action: 'UPDATE',
        operation: AUDIT_OPERATIONS.PARTY_ANONYMIZED,
        entityType: table,
        entityId: subjectId,
        previousState: toJsonState(before),
        newState: toJsonState(result.patch),
      });
    }

    const deletedChannels = await this.sideEffects.deleteContactChannels(
      tx,
      subjectType,
      subjectId,
    );
    const purgedDocuments = await this.sideEffects.purgeIdDocuments(tx, subjectType, subjectId);
    const deactivatedAccounts =
      subjectType === 'guarantor'
        ? 0
        : await this.sideEffects.deactivateBankAccounts(tx, subjectType, subjectId);
    const anonymizedNotifications =
      subjectType === 'guarantor'
        ? 0
        : await this.sideEffects.anonymizeNotifications(tx, subjectType, subjectId, reserved);
    const anonymizedMessages = await this.sideEffects.anonymizeMessageLogs(
      tx,
      knownAddresses,
      reserved,
    );

    const preserved: PreservedCount[] = [
      {
        table: 'documents',
        rows: purgedDocuments,
        reason:
          'ID_DOCUMENT : objet purgé du stockage, ligne conservée (deleted_at posé, mécanisme phase 1)',
      },
    ];
    if (subjectType !== 'guarantor') {
      preserved.push({
        table: 'bank_accounts',
        rows: deactivatedAccounts,
        reason: 'Désactivé (is_active = false), non supprimé',
      });
    }
    for (const financialTable of NEVER_TOUCHED_TABLES) {
      preserved.push({
        table: financialTable,
        rows: await this.sideEffects.countReferencing(tx, financialTable, subjectType, subjectId),
        reason: 'Jamais touché : écriture financière append-only ou journal immuable (arbitrage 7)',
      });
    }

    const anonymized: AnonymizedCount[] = [
      { table, rows: result.alreadyAnonymized ? 0 : 1, fields: result.fields },
    ];
    if (subjectType !== 'guarantor' && anonymizedNotifications > 0) {
      anonymized.push({
        table: 'notifications',
        rows: anonymizedNotifications,
        fields: ['recipientAddress', 'body', 'payload'],
      });
    }
    if (anonymizedMessages > 0) {
      anonymized.push({
        table: 'message_logs',
        rows: anonymizedMessages,
        fields: ['toAddress', 'contentPreview', 'rawPayload'],
      });
    }

    return {
      alreadyAnonymized: result.alreadyAnonymized,
      anonymized,
      deleted: [{ table: 'contact_channels', rows: deletedChannels }],
      preserved,
    };
  }

  private async loadParty(
    tx: TenantClient,
    table: 'tenants' | 'landlords' | 'guarantors',
    id: string,
  ): Promise<(PartyAnonymizationRow & Record<string, unknown>) | null> {
    const row = await (
      tx as never as Record<string, { findFirst: (args: unknown) => Promise<unknown> }>
    )[table].findFirst({ where: { id } });
    return row as (PartyAnonymizationRow & Record<string, unknown>) | null;
  }

  private async applyPartyPatch(
    tx: TenantClient,
    table: 'tenants' | 'landlords' | 'guarantors',
    id: string,
    result: AnonymizationResult,
  ): Promise<void> {
    await (tx as never as Record<string, { update: (args: unknown) => Promise<unknown> }>)[
      table
    ].update({
      where: { id },
      data: { ...result.patch, updated_at: new Date() },
    });
  }
}

import { Inject, Injectable } from '@nestjs/common';
import type { TenantClient } from '../../../shared/prisma/prisma.service';
import { OBJECT_STORAGE, type ObjectStorage } from '../../documents/domain/storage.port';
import type { ContactOwnerType } from '../../parties/domain/party-rules';
import type { ReservedValues } from '../domain/erasure-rules';
import type { SubjectType } from '../domain/subject';

const OWNER_TYPE: Record<Exclude<SubjectType, 'user'>, ContactOwnerType> = {
  tenant: 'TENANT',
  landlord: 'LANDLORD',
  guarantor: 'GUARANTOR',
};

/**
 * Effets de bord de l'anonymisation qui ne portent PAS sur la table du tiers
 * lui-même : `contact_channels`, `documents` (ID_DOCUMENT), `bank_accounts`,
 * `notifications`, `message_logs`, et le dénombrement des tables financières
 * JAMAIS touchées (arbitrage 7). Extrait de `ErasureExecutionService` pour
 * rester sous 180 lignes par fichier.
 */
@Injectable()
export class ErasureSideEffectsService {
  constructor(@Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage) {}

  async deleteContactChannels(
    tx: TenantClient,
    subjectType: Exclude<SubjectType, 'user'>,
    subjectId: string,
  ): Promise<number> {
    const { count } = await tx.contact_channels.deleteMany({
      where: { owner_type: OWNER_TYPE[subjectType], owner_id: subjectId },
    });
    return count;
  }

  /** ID_DOCUMENT rattachés au tiers : objet purgé du stockage, ligne conservée avec `deleted_at` (mécanisme phase 1). */
  async purgeIdDocuments(
    tx: TenantClient,
    subjectType: Exclude<SubjectType, 'user'>,
    subjectId: string,
  ): Promise<number> {
    const rows = await tx.documents.findMany({
      where: {
        related_entity_type: subjectType,
        related_entity_id: subjectId,
        kind: 'ID_DOCUMENT',
        deleted_at: null,
      },
      select: { id: true, object_key: true },
    });
    for (const row of rows) {
      await this.storage.deleteObject(row.object_key).catch(() => undefined);
    }
    if (rows.length === 0) return 0;
    await tx.documents.updateMany({
      where: { id: { in: rows.map((r) => r.id) } },
      data: { deleted_at: new Date(), updated_at: new Date() },
    });
    return rows.length;
  }

  async deactivateBankAccounts(
    tx: TenantClient,
    subjectType: Exclude<SubjectType, 'user'>,
    subjectId: string,
  ): Promise<number> {
    const where = subjectType === 'tenant' ? { tenant_id: subjectId } : { landlord_id: subjectId };
    const { count } = await tx.bank_accounts.updateMany({
      where: { ...where, is_active: true },
      data: { is_active: false, updated_at: new Date() },
    });
    return count;
  }

  async anonymizeNotifications(
    tx: TenantClient,
    subjectType: Exclude<SubjectType, 'user'>,
    subjectId: string,
    reserved: ReservedValues,
  ): Promise<number> {
    const where =
      subjectType === 'tenant'
        ? { recipient_tenant_id: subjectId }
        : { recipient_landlord_id: subjectId };
    const { count } = await tx.notifications.updateMany({
      where: { ...where, NOT: { recipient_address: reserved.phone } },
      data: { recipient_address: reserved.phone, body: '', payload: {}, updated_at: new Date() },
    });
    return count;
  }

  /**
   * `message_logs` ne porte aucune colonne `tenant_id`/`landlord_id` : le seul
   * rattachement possible au tiers est `to_address`, comparé aux coordonnées
   * connues du tiers AVANT anonymisation (décision documentée dans le rapport
   * final de l'agent, aucun schéma de jointure plus précis n'existe).
   */
  async anonymizeMessageLogs(
    tx: TenantClient,
    knownAddresses: string[],
    reserved: ReservedValues,
  ): Promise<number> {
    if (knownAddresses.length === 0) return 0;
    const { count } = await tx.message_logs.updateMany({
      where: { to_address: { in: knownAddresses }, NOT: { to_address: reserved.phone } },
      data: {
        to_address: reserved.phone,
        content_preview: null,
        raw_payload: {},
        updated_at: new Date(),
      },
    });
    return count;
  }

  /**
   * Total des paiements et dénombrement des quittances du tiers : recalculé
   * AVANT et APRÈS l'anonymisation par l'appelant, pour vérifier — et non
   * supposer — que l'effacement n'a rien changé aux écritures financières
   * (contrat § Effacement, dernier paragraphe).
   */
  async financialTotals(
    tx: TenantClient,
    subjectType: Exclude<SubjectType, 'user'>,
    subjectId: string,
  ): Promise<{ amount: bigint; receiptsCount: bigint }> {
    if (subjectType === 'guarantor') return { amount: 0n, receiptsCount: 0n };
    const column = `${subjectType}_id`;
    const rows = await tx.$queryRawUnsafe<{ amount: bigint | null; receipts: bigint }[]>(
      `SELECT
          (SELECT coalesce(sum(amount), 0) FROM payments WHERE ${column} = $1::uuid) AS amount,
          (SELECT count(*) FROM receipts WHERE ${column} = $1::uuid) AS receipts`,
      subjectId,
    );
    return { amount: rows[0]?.amount ?? 0n, receiptsCount: rows[0]?.receipts ?? 0n };
  }

  /** Dénombre, pour le rapport, les lignes des tables financières jamais touchées qui citent le tiers. */
  async countReferencing(
    tx: TenantClient,
    table: string,
    subjectType: Exclude<SubjectType, 'user'>,
    subjectId: string,
  ): Promise<number> {
    if (subjectType !== 'tenant' && subjectType !== 'landlord') return 0;
    const column = `${subjectType}_id`;
    if (!COLUMN_PRESENCE[table]?.includes(column)) return 0;
    const rows = await tx.$queryRawUnsafe<{ n: bigint }[]>(
      `SELECT count(*)::bigint AS n FROM ${table} WHERE ${column} = $1::uuid`,
      subjectId,
    );
    return Number(rows[0]?.n ?? 0n);
  }
}

/** Colonnes `tenant_id`/`landlord_id` réellement portées par chaque table jamais touchée (vérifié contre `docs/schema/schema.sql`). */
const COLUMN_PRESENCE: Record<string, readonly string[]> = {
  payments: ['tenant_id', 'landlord_id'],
  payment_allocations: [],
  cash_receipts: [],
  receipts: ['tenant_id', 'landlord_id'],
  rent_invoices: ['tenant_id', 'landlord_id'],
  invoice_lines: [],
  deposits: ['tenant_id'],
  deposit_movements: [],
  audit_logs: [],
};

export function collectKnownAddresses(row: Record<string, unknown>): string[] {
  const values = [row.primary_phone, row.secondary_phone, row.whatsapp_phone, row.email].filter(
    (v): v is string => typeof v === 'string' && v.length > 0,
  );
  return [...new Set(values)];
}

import { Inject, Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { toAmount } from '../../../shared/money/amount';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { NOTIFICATION_ENQUEUER, type NotificationEnqueuer } from '../../notifications/domain/ports';
import { MESSAGE_TEMPLATE_CODES } from '../../notifications/domain/template-codes';
import { NumberingService } from '../../numbering/application/numbering.service';
import {
  assertActivatable,
  assertMandateEditable,
  assertSuspendable,
  assertTerminable,
  scopesOverlap,
  type CommissionBasis,
  type MandateScope,
  type MandateStatus,
} from '../domain/mandate-rules';
import type { LandlordInvitationResult } from '../domain/ports';
import { toMandateView, type MandateRow, type MandateView } from './mandate-views';

export interface MandateInput {
  landlordId: string;
  propertyIds: string[];
  scope?: MandateScope;
  startDate: string;
  endDate?: string;
  noticeDays?: number;
  autoRenew?: boolean;
  commissionBasis?: CommissionBasis;
  commissionRateBps?: number;
  commissionFlatAmount?: number;
  lettingFeeRateBps?: number;
  vatRateBps?: number;
  payoutDay?: number;
  payoutBankAccountId?: string;
  notes?: string;
}

export type MandateUpdateInput = Partial<Omit<MandateInput, 'landlordId' | 'propertyIds'>>;

function toDateOnly(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}

/**
 * Module `mandates` : mandats de gestion, propriétaire exclusif de
 * `management_mandates`.
 *
 * DÉCISION SUR LE MULTI-BIENS (voir docs/schema/parts/04a_mandates_leases.sql,
 * commentaire de la table) — `management_mandates.property_id` est une
 * colonne UNIQUE UUID NULLABLE, sans table de jonction, et la référence est
 * `UNIQUE (organization_id, reference)` : impossible de porter un sous-
 * ensemble de plusieurs biens sur une même ligne ou sur plusieurs lignes
 * partageant une référence. Le commentaire SQL tranche lui-même : « pour
 * tout son portefeuille ou pour un bien donné ». Donc :
 *   - `property_id` renseigné = mandat borné à CE bien précis.
 *   - `property_id = NULL`    = mandat PORTEFEUILLE, sur tout ce que le
 *     bailleur possède (présent ET futur) — cohérent avec l'arbitrage n°1 du
 *     contrat sur les relevés consolidés (`owner_statements.property_id`
 *     nul).
 * `MandateInput.propertyIds` (tableau, un ou plusieurs biens au contrat) se
 * résout donc ainsi : exactement 1 id → mandat mono-bien ; 0 (rejeté, la
 * création exige au moins un bien) ou plusieurs ids → mandat portefeuille,
 * après avoir vérifié que chaque id fourni appartient bien au bailleur (la
 * liste précise n'est PAS conservée au-delà de cette validation : le schéma
 * n'a pas de colonne pour ça). `POST /{id}/properties` applique la même
 * bascule mono-bien → portefeuille quand on y ajoute un second bien
 * (voir `attachProperties`).
 *
 * Contrôle « un bien, un seul mandat ACTIF à la fois » (contrat) : deux
 * mandats du MÊME bailleur se chevauchent dès que l'un des deux est
 * portefeuille, ou qu'ils portent sur le même bien (`scopesOverlap`,
 * domain/mandate-rules.ts). Appliqué à l'activation et au rattachement de
 * biens.
 */
@Injectable()
export class MandatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly numbering: NumberingService,
    private readonly config: AppConfigService,
    @Inject(NOTIFICATION_ENQUEUER) private readonly notifications: NotificationEnqueuer,
  ) {}

  async create(organizationId: string, userId: string, input: MandateInput): Promise<MandateView> {
    return this.prisma.withTenant(organizationId, userId, (tx) =>
      this.createInTx(tx, organizationId, userId, input),
    );
  }

  /** Corps de la création, rejouable depuis une transaction déjà ouverte. */
  async createInTx(
    tx: TenantClient,
    organizationId: string,
    _userId: string,
    input: MandateInput,
  ): Promise<MandateView> {
    const landlord = await tx.landlords.findFirst({
      where: { id: input.landlordId, deleted_at: null },
      select: { id: true },
    });
    if (!landlord)
      throw new DomainError('PARTIES.LANDLORD_NOT_FOUND', { landlordId: input.landlordId });

    const propertyId = await this.resolvePropertyScope(
      tx,
      organizationId,
      input.landlordId,
      input.propertyIds,
    );

    const org = await tx.organizations.findFirst({
      where: { id: organizationId },
      select: { type: true },
    });
    const isIndependentManager = org?.type === 'INDEPENDENT_MANAGER';

    const commissionBasis =
      input.commissionBasis ?? (isIndependentManager ? 'RATE_BPS_ON_RENT_COLLECTED' : undefined);
    const commissionRateBps =
      input.commissionRateBps ??
      (isIndependentManager ? this.config.get('AGENCY_DEFAULT_COMMISSION_RATE_BPS') : undefined);

    // `management_mandates_commission_chk` exige l'un des deux en base : un
    // taux ou un montant forfaitaire. Seule l'organisation
    // INDEPENDENT_MANAGER a un défaut explicite au contrat (10 %) ; toute
    // autre organisation qui omet les deux reçoit un 422 lisible plutôt que
    // l'échec brut de la contrainte SQL.
    if (commissionRateBps == null && input.commissionFlatAmount == null) {
      throw new DomainError('AGENCY.MANDATE_COMMISSION_REQUIRED', {});
    }

    const id = newId();
    const { number } = await this.numbering.nextNumber(tx, organizationId, 'MANDATE', new Date());

    const created = (await tx.management_mandates.create({
      data: {
        id,
        organization_id: organizationId,
        landlord_id: input.landlordId,
        property_id: propertyId,
        reference: number,
        scope: input.scope ?? 'FULL_MANAGEMENT',
        status: 'DRAFT',
        start_date: toDateOnly(input.startDate),
        end_date: input.endDate ? toDateOnly(input.endDate) : null,
        notice_days: input.noticeDays,
        auto_renew: input.autoRenew,
        commission_basis: commissionBasis,
        commission_rate_bps: commissionRateBps,
        commission_flat_amount:
          input.commissionFlatAmount != null ? toAmount(input.commissionFlatAmount) : null,
        letting_fee_rate_bps: input.lettingFeeRateBps ?? null,
        vat_rate_bps: input.vatRateBps ?? this.config.get('AGENCY_COMMISSION_VAT_RATE_BPS'),
        payout_day: input.payoutDay,
        payout_bank_account_id: input.payoutBankAccountId ?? null,
        notes: input.notes?.trim() || null,
      },
    })) as unknown as MandateRow;

    await audit(this.auditService, tx, {
      action: 'CREATE',
      operation: AUDIT_OPERATIONS.MANDATE_CREATED,
      entityType: 'management_mandates',
      entityId: id,
      newState: toJsonState(toMandateView(created)),
    });
    return toMandateView(created);
  }

  async update(
    organizationId: string,
    userId: string,
    id: string,
    input: MandateUpdateInput,
  ): Promise<MandateView> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const before = await this.require(tx, id);
      assertMandateEditable(before.status as MandateStatus);

      const after = (await tx.management_mandates.update({
        where: { id },
        data: {
          ...(input.scope !== undefined ? { scope: input.scope } : {}),
          ...(input.endDate !== undefined
            ? { end_date: input.endDate ? toDateOnly(input.endDate) : null }
            : {}),
          ...(input.noticeDays !== undefined ? { notice_days: input.noticeDays } : {}),
          ...(input.autoRenew !== undefined ? { auto_renew: input.autoRenew } : {}),
          ...(input.commissionBasis !== undefined
            ? { commission_basis: input.commissionBasis }
            : {}),
          ...(input.commissionRateBps !== undefined
            ? { commission_rate_bps: input.commissionRateBps }
            : {}),
          ...(input.commissionFlatAmount !== undefined
            ? {
                commission_flat_amount:
                  input.commissionFlatAmount != null ? toAmount(input.commissionFlatAmount) : null,
              }
            : {}),
          ...(input.lettingFeeRateBps !== undefined
            ? { letting_fee_rate_bps: input.lettingFeeRateBps }
            : {}),
          ...(input.vatRateBps !== undefined ? { vat_rate_bps: input.vatRateBps } : {}),
          ...(input.payoutDay !== undefined ? { payout_day: input.payoutDay } : {}),
          ...(input.payoutBankAccountId !== undefined
            ? { payout_bank_account_id: input.payoutBankAccountId }
            : {}),
          ...(input.notes !== undefined ? { notes: input.notes?.trim() || null } : {}),
          updated_at: new Date(),
        },
      })) as unknown as MandateRow;

      await audit(this.auditService, tx, {
        action: 'UPDATE',
        operation: AUDIT_OPERATIONS.MANDATE_UPDATED,
        entityType: 'management_mandates',
        entityId: id,
        previousState: toJsonState(toMandateView(before)),
        newState: toJsonState(toMandateView(after)),
      });
      return toMandateView(after);
    });
  }

  async activate(organizationId: string, userId: string, id: string): Promise<MandateView> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const before = await this.require(tx, id);
      assertActivatable(before.status as MandateStatus);
      await this.assertNoConflict(tx, organizationId, before.landlord_id, before.property_id, id);

      const after = (await tx.management_mandates.update({
        where: { id },
        data: {
          status: 'ACTIVE',
          signed_at: before.signed_at ?? new Date(),
          updated_at: new Date(),
        },
      })) as unknown as MandateRow;

      await audit(this.auditService, tx, {
        action: 'STATE_TRANSITION',
        operation: AUDIT_OPERATIONS.MANDATE_ACTIVATED,
        entityType: 'management_mandates',
        entityId: id,
        previousState: toJsonState({ status: before.status }),
        newState: toJsonState({ status: after.status, signedAt: after.signed_at }),
      });
      return toMandateView(after);
    });
  }

  /**
   * Motif de suspension : aucune colonne dédiée en base (`notes` sert déjà
   * aux annotations libres du mandat, la réutiliser l'écraserait à chaque
   * transition). Le motif est donc uniquement tracé dans
   * `audit_logs.new_state`, consultable par l'historique du mandat.
   */
  async suspend(
    organizationId: string,
    userId: string,
    id: string,
    reason: string,
  ): Promise<MandateView> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const before = await this.require(tx, id);
      assertSuspendable(before.status as MandateStatus, reason);

      const after = (await tx.management_mandates.update({
        where: { id },
        data: { status: 'SUSPENDED', updated_at: new Date() },
      })) as unknown as MandateRow;

      await audit(this.auditService, tx, {
        action: 'STATE_TRANSITION',
        operation: AUDIT_OPERATIONS.MANDATE_SUSPENDED,
        entityType: 'management_mandates',
        entityId: id,
        previousState: toJsonState({ status: before.status }),
        newState: toJsonState({ status: after.status, reason: reason.trim() }),
      });
      return toMandateView(after);
    });
  }

  async terminate(
    organizationId: string,
    userId: string,
    id: string,
    effectiveDate: string,
    reason: string,
  ): Promise<MandateView> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const before = await this.require(tx, id);
      assertTerminable(before.status as MandateStatus, effectiveDate, reason);

      const after = (await tx.management_mandates.update({
        where: { id },
        data: {
          status: 'TERMINATED',
          terminated_at: toDateOnly(effectiveDate),
          termination_reason: reason.trim(),
          updated_at: new Date(),
        },
      })) as unknown as MandateRow;

      await audit(this.auditService, tx, {
        action: 'STATE_TRANSITION',
        operation: AUDIT_OPERATIONS.MANDATE_TERMINATED,
        entityType: 'management_mandates',
        entityId: id,
        previousState: toJsonState({ status: before.status }),
        newState: toJsonState({
          status: after.status,
          terminatedAt: after.terminated_at,
          terminationReason: after.termination_reason,
        }),
      });
      return toMandateView(after);
    });
  }

  /**
   * Rattache un ou plusieurs biens supplémentaires (contrat, règle 7).
   * Bascule mono-bien → portefeuille dès que le résultat dépasse un seul
   * bien (voir le commentaire de tête de fichier) ; sans effet de colonne si
   * le mandat est déjà portefeuille ou si le seul bien fourni est déjà celui
   * du mandat, mais le contrôle « un bien, un mandat actif » est rejoué dans
   * tous les cas.
   */
  async attachProperties(
    organizationId: string,
    userId: string,
    id: string,
    propertyIds: string[],
  ): Promise<MandateView> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const before = await this.require(tx, id);
      if (!propertyIds.length) {
        throw new DomainError('VALIDATION.INVALID_PAYLOAD', {
          propertyIds: 'au moins un bien requis',
        });
      }
      for (const propertyId of propertyIds) {
        const property = await tx.properties.findFirst({
          where: {
            id: propertyId,
            organization_id: organizationId,
            landlord_id: before.landlord_id,
            deleted_at: null,
          },
          select: { id: true },
        });
        if (!property) {
          throw new DomainError('AGENCY.MANDATE_PROPERTY_NOT_FOUND', {
            propertyId,
            landlordId: before.landlord_id,
          });
        }
      }

      const distinctIds = new Set(propertyIds);
      if (before.property_id) distinctIds.add(before.property_id);
      const nextPropertyId =
        before.property_id === null ? null : distinctIds.size > 1 ? null : before.property_id;

      await this.assertNoConflict(tx, organizationId, before.landlord_id, nextPropertyId, id);

      if (nextPropertyId === before.property_id) return toMandateView(before);

      const after = (await tx.management_mandates.update({
        where: { id },
        data: { property_id: nextPropertyId, updated_at: new Date() },
      })) as unknown as MandateRow;

      await audit(this.auditService, tx, {
        action: 'UPDATE',
        operation: AUDIT_OPERATIONS.MANDATE_PROPERTY_ATTACHED,
        entityType: 'management_mandates',
        entityId: id,
        previousState: toJsonState({ propertyId: before.property_id }),
        newState: toJsonState({
          propertyId: nextPropertyId,
          attachedPropertyIds: propertyIds,
          reason: 'consolidated',
        }),
      });
      return toMandateView(after);
    });
  }

  /** Voir `domain/ports.ts` (MANDATE_LANDLORD_INVITER) pour la décision d'implémentation. */
  async sendInvitation(
    organizationId: string,
    userId: string,
    id: string,
  ): Promise<LandlordInvitationResult> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const mandate = await this.require(tx, id);
      const landlord = await tx.landlords.findFirst({
        where: { id: mandate.landlord_id },
        select: { id: true, primary_phone: true },
      });
      if (!landlord) {
        throw new DomainError('PARTIES.LANDLORD_NOT_FOUND', { landlordId: mandate.landlord_id });
      }

      const link = `${this.config.get('PORTAL_BASE_URL')}/activer?tel=${encodeURIComponent(
        landlord.primary_phone,
      )}`;
      const { notificationId } = await this.notifications.enqueue({
        organizationId,
        templateCode: MESSAGE_TEMPLATE_CODES.LANDLORD_PORTAL_INVITE,
        recipient: { phone: landlord.primary_phone, landlordId: landlord.id },
        variables: { link },
        relatedEntity: { type: 'management_mandate', id: mandate.id },
        actorUserId: userId,
      });

      await audit(this.auditService, tx, {
        action: 'CREATE',
        operation: AUDIT_OPERATIONS.MANDATE_LANDLORD_INVITED,
        entityType: 'management_mandates',
        entityId: id,
        newState: toJsonState({ notificationId, landlordId: landlord.id }),
      });

      return { notificationId, invitationStatus: 'SENT' };
    });
  }

  /** Lit un mandat vivant, ou lève le 404 du contrat. */
  async require(tx: TenantClient, id: string): Promise<MandateRow> {
    const row = (await tx.management_mandates.findFirst({
      where: { id },
    })) as unknown as MandateRow | null;
    if (!row) throw new DomainError('AGENCY.MANDATE_NOT_FOUND', { mandateId: id });
    return row;
  }

  /**
   * Résout `MandateInput.propertyIds` en `property_id` (voir le commentaire
   * de tête de fichier) après avoir vérifié que chaque bien appartient bien
   * à ce bailleur, dans cette organisation.
   */
  private async resolvePropertyScope(
    tx: TenantClient,
    organizationId: string,
    landlordId: string,
    propertyIds: string[],
  ): Promise<string | null> {
    if (!propertyIds.length) {
      throw new DomainError('VALIDATION.INVALID_PAYLOAD', {
        propertyIds: 'un ou plusieurs biens requis',
      });
    }
    for (const propertyId of propertyIds) {
      const property = await tx.properties.findFirst({
        where: {
          id: propertyId,
          organization_id: organizationId,
          landlord_id: landlordId,
          deleted_at: null,
        },
        select: { id: true },
      });
      if (!property) {
        throw new DomainError('AGENCY.MANDATE_PROPERTY_NOT_FOUND', { propertyId, landlordId });
      }
    }
    return propertyIds.length === 1 ? propertyIds[0] : null;
  }

  /** Contrôle « un bien, un seul mandat ACTIF à la fois » (contrat). */
  private async assertNoConflict(
    tx: TenantClient,
    organizationId: string,
    landlordId: string,
    candidatePropertyId: string | null,
    excludeMandateId: string,
  ): Promise<void> {
    const others = await tx.management_mandates.findMany({
      where: {
        organization_id: organizationId,
        landlord_id: landlordId,
        status: 'ACTIVE',
        id: { not: excludeMandateId },
      },
      select: { id: true, property_id: true },
    });
    const conflict = others.find((other) =>
      scopesOverlap({ propertyId: candidatePropertyId }, { propertyId: other.property_id }),
    );
    if (conflict) {
      throw new DomainError('AGENCY.PROPERTY_ALREADY_MANDATED', {
        propertyId: candidatePropertyId,
        conflictingMandateId: conflict.id,
      });
    }
  }
}
